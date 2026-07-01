using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using VpRealEstate.Www.Model;
using VpRealEstate.Www.Services;

namespace DmWebsite.Pages;

public class Index(
    IInvestmentService investmentService,
    ICmsFileService cmsFileService,
    IPropertyService propertyService,
    IThumbnailService thumbnailService) : PageModel
{
    public IReadOnlyList<InvestmentSliderItemVm> InvestmentSlides { get; private set; } = [];

    public async Task<IActionResult> OnGetAsync()
    {
        var ct = HttpContext.RequestAborted;

        var investments = await investmentService.GetInvestmentList(null, ct);
        if (investments.Count == 0)
        {
            return Page();
        }

        var cmsFiles = await cmsFileService.GetInvestmentCmsFiles(
            [CmsFileCategories.Investment.Visualization],
            investments.Select(x => x.Id),
            ct);

        var visualizationsByInvestment = cmsFiles
            .Where(x => x.InvestmentId.HasValue)
            .GroupBy(x => x.InvestmentId!.Value)
            .ToDictionary(
                x => x.Key,
                x => x.OrderBy(y => y.Ordinal).Select(y => y.StorePath).ToList());

        var slides = new List<InvestmentSliderItemVm>();

        foreach (var investment in investments)
        {
            var properties = await propertyService.GetInvestmentProperties(investment.Id, ct);
            var mainProperties = properties
                .Where(x => !x.OwnerPropertyId.HasValue &&
                            x.Type is PropertyType.Flat or PropertyType.House or PropertyType.Premises)
                .ToList();

            var availableProperties = mainProperties
                .Where(x => x.Status != "Sold")
                .ToList();

            var stats = BuildStats(mainProperties, availableProperties);
            var isSoldOut = stats.TotalAvailableCount == 0;

            string? imageUrl = null;
            if (visualizationsByInvestment.TryGetValue(investment.Id, out var images) && images.Count > 0)
            {
                try
                {
                    imageUrl = await thumbnailService.GetThumbnailUrl(
                        images[0],
                        ThumbnailKind.Original,
                        ImageFormat.Webp,
                        ct);
                }
                catch (Exception)
                {
                    // fallback w widoku
                }
            }

            var progressPercent = stats.TotalPropertiesCount > 0
                ? (int)Math.Round((double)(stats.TotalPropertiesCount - stats.TotalAvailableCount) / stats.TotalPropertiesCount * 100)
                : isSoldOut ? 100 : 0;

            slides.Add(new InvestmentSliderItemVm(
                investment,
                imageUrl,
                stats,
                isSoldOut,
                progressPercent));
        }

        InvestmentSlides = slides;
        return Page();
    }

    private static InvestmentAggregatedStats BuildStats(
        IReadOnlyList<Property> mainProperties,
        IReadOnlyList<Property> availableProperties)
    {
        var displayProperties = mainProperties.Count > 0 ? mainProperties : availableProperties;

        return new InvestmentAggregatedStats
        {
            TotalPropertiesCount = mainProperties.Count,
            TotalAvailableCount = availableProperties.Count,
            MinArea = displayProperties.Count > 0 ? displayProperties.Min(x => x.Area ?? 0M) : 0M,
            MaxArea = displayProperties.Count > 0 ? displayProperties.Max(x => x.Area ?? 0M) : 0M,
            MinRooms = displayProperties.Count > 0 ? displayProperties.Min(x => x.TotalRooms ?? 0) : 0,
            MaxRooms = displayProperties.Count > 0 ? displayProperties.Max(x => x.TotalRooms ?? 0) : 0,
            MinFloor = displayProperties.Count > 0 ? displayProperties.Min(x => x.FloorValue ?? 0) : 0,
            MaxFloor = displayProperties.Count > 0 ? displayProperties.Max(x => x.FloorValue ?? 0) : 0,
        };
    }

    public sealed class InvestmentAggregatedStats
    {
        public decimal MinArea { get; init; }
        public decimal MaxArea { get; init; }
        public int MinRooms { get; init; }
        public int MaxRooms { get; init; }
        public int MinFloor { get; init; }
        public int MaxFloor { get; init; }
        public int TotalAvailableCount { get; init; }
        public int TotalPropertiesCount { get; init; }
    }

    public sealed record InvestmentSliderItemVm(
        ListInvestment Investment,
        string? ImageUrl,
        InvestmentAggregatedStats Stats,
        bool IsSoldOut,
        int ProgressPercent);
}

using DmWebsite.Services;
using DmWebsite.ViewModels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using VpRealEstate.Www.Model;
using VpRealEstate.Www.Services;

namespace DmWebsite.Pages;

public class Investments : PageModel
{
    private readonly IInvestmentService _investmentService;
    private readonly ICmsFileService _cmsFileService;
    private readonly IBuildingService _buildingService;
    private readonly IPropertyService _propertyService;

    public Investments(
        IInvestmentService investmentService,
        ICmsFileService cmsFileService,
        IBuildingService buildingService,
        IPropertyService propertyService)
    {
        _investmentService = investmentService;
        _cmsFileService = cmsFileService;
        _buildingService = buildingService;
        _propertyService = propertyService;
    }

    public InvestmentSliderSectionVm InvestmentSliderSection { get; private set; } = new();

    public async Task<IActionResult> OnGetAsync()
    {
        var ct = HttpContext.RequestAborted;
        await PrepareInvestmentsSectionAsync(ct);
        return Page();
    }

    private async Task PrepareInvestmentsSectionAsync(CancellationToken ct)
    {
        var investments = await _investmentService.GetInvestmentList(null, GetInvestmentsFlags.Default, ct, countOnlyAvailableProperties: false);
        if (investments.Count == 0)
        {
            InvestmentSliderSection = new InvestmentSliderSectionVm();
            return;
        }

        var visualizations = await LoadVisualizationsByInvestmentAsync(investments, ct);
        var stats = await BuildStatsByInvestmentAsync(investments, ct);
        var completionByInvestment = await LoadCompletionByInvestmentAsync(investments, ct);

        InvestmentSliderSection = new InvestmentSliderSectionVm
        {
            Investments = investments,
            VisualizationsByInvestment = visualizations,
            StatsByInvestment = stats,
            CompletionByInvestment = completionByInvestment,
        };
    }

    private async Task<IReadOnlyDictionary<int, string?>> LoadCompletionByInvestmentAsync(
        IReadOnlyList<ListInvestment> investments,
        CancellationToken ct)
    {
        var result = new Dictionary<int, string?>();

        foreach (var investment in investments)
        {
            var tasks = await _investmentService.GetInvestmentTasks(investment.Id, ct);
            result[investment.Id] = InvestmentCompletionResolver.GetCompletionText(tasks);
        }

        return result;
    }

    private async Task<IReadOnlyDictionary<int, List<string>>> LoadVisualizationsByInvestmentAsync(
        IReadOnlyList<ListInvestment> investments,
        CancellationToken ct)
    {
        var cmsFiles = await _cmsFileService.GetInvestmentCmsFiles(
            ["Kafelek", "Logo"],
            investments.Select(x => x.Id),
            ct);

        return cmsFiles
            .Where(x => x.InvestmentId.HasValue)
            .GroupBy(x => x.InvestmentId!.Value, x => x)
            .ToDictionary(
                x => x.Key,
                x => x.OrderBy(y => y.Ordinal).Select(y => y.StorePath).ToList());
    }

    private async Task<IReadOnlyDictionary<int, InvestmentAggregatedStats>> BuildStatsByInvestmentAsync(
        IReadOnlyList<ListInvestment> investments,
        CancellationToken ct)
    {
        var statsDictionary = new Dictionary<int, InvestmentAggregatedStats>();

        foreach (var investment in investments)
        {
            var properties = await _propertyService.GetInvestmentProperties(investment.Id, ct);
            var (minFloor, maxFloor) = await GetFloorRangeAsync(investment.Id, ct);
            statsDictionary[investment.Id] = BuildInvestmentStats(properties, minFloor, maxFloor);
        }

        return statsDictionary;
    }

    private static InvestmentAggregatedStats BuildInvestmentStats(
        IReadOnlyList<Property> properties,
        int? minFloor,
        int? maxFloor)
    {
        var availableProps = properties
            .Where(x => x.Status != "Sold" && !x.OwnerPropertyId.HasValue)
            .ToList();

        var statsSource = properties;
        var roomsSource = statsSource.Where(x => x.TotalRooms > 0).ToList();

        return new InvestmentAggregatedStats
        {
            TotalPropertiesCount = properties.Count,
            TotalAvailableCount = availableProps.Count,
            MinArea = statsSource.Count > 0 ? statsSource.Min(x => x.Area ?? 0M) : 0,
            MaxArea = statsSource.Count > 0 ? statsSource.Max(x => x.Area ?? 0M) : 0,
            MinRooms = roomsSource.Count > 0 ? roomsSource.Min(x => x.TotalRooms ?? 0) : 0,
            MaxRooms = roomsSource.Count > 0 ? roomsSource.Max(x => x.TotalRooms ?? 0) : 0,
            MinFloor = minFloor,
            MaxFloor = maxFloor,
        };
    }

    private async Task<(int? Min, int? Max)> GetFloorRangeAsync(int investmentId, CancellationToken ct)
    {
        var buildings = await _buildingService.GetBuildingsByInvestmentId(investmentId, ct);
        if (buildings.Count == 0)
        {
            return (null, null);
        }

        var floors = await _buildingService.GetBuildingsFloors(buildings.Select(x => x.Id), ct);
        if (floors.Count == 0)
        {
            return (null, null);
        }

        var numbers = floors.Select(f => f.Level).ToList();
        return numbers.Count == 0 ? (null, null) : (numbers.Min(), numbers.Max());
    }
}

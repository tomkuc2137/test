using DmWebsite.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using VpRealEstate.Www.Model;
using VpRealEstate.Www.Services;

namespace DmWebsite.Pages;

public class CustomizeSpaceModel(
    ICmsFileService cmsFileService,
    IThumbnailService thumbnailService) : PageModel
{
    private const string GalleryCategory = "Galeria";

    public IReadOnlyList<GalleryImageVm> GalleryImages { get; private set; } = [];

    public async Task<IActionResult> OnGetAsync()
    {
        await PrepareGalleryAsync(HttpContext.RequestAborted);
        return Page();
    }

    private async Task PrepareGalleryAsync(CancellationToken ct)
    {
        var cmsFiles = await cmsFileService.GetSiteCmsFiles([GalleryCategory], ct);
        if (cmsFiles.Count == 0)
        {
            return;
        }

        var images = new List<GalleryImageVm>();

        foreach (var file in cmsFiles.OrderBy(x => x.Ordinal))
        {
            images.Add(new GalleryImageVm(
                ThumbJpg: await thumbnailService.GetThumbnailUrl(file.StorePath, AppThumbnails.PhotoGallery, ImageFormat.Jpg, ct),
                ThumbWebp: await thumbnailService.GetThumbnailUrl(file.StorePath, AppThumbnails.PhotoGallery, ImageFormat.Webp, ct),
                FullJpg: await thumbnailService.GetThumbnailUrl(file.StorePath, ThumbnailKind.Original, ImageFormat.Jpg, ct),
                FullWebp: await thumbnailService.GetThumbnailUrl(file.StorePath, ThumbnailKind.Original, ImageFormat.Webp, ct),
                Alt: file.Alt ?? file.Title ?? string.Empty));
        }

        GalleryImages = images;
    }

    public sealed record GalleryImageVm(
        string ThumbJpg,
        string ThumbWebp,
        string FullJpg,
        string FullWebp,
        string Alt);
}

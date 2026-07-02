using VpRealEstate.Www.Services;

namespace DmWebsite.Services;

public static class AppThumbnails
{
    public static readonly ThumbnailKind PhotoGallery = new("PhotoGallery", 408, 270);
    public static readonly ThumbnailKind Logo = new("Logo", 335, 250);
    public static readonly ThumbnailKind Original = ThumbnailKind.Original;
}

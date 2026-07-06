using VpRealEstate.Www.Model;

namespace DmWebsite.Services;

public static class InvestmentCompletionResolver
{
    /// <summary>
    /// Termin realizacji z ostatniego etapu (najwyższy Ordinal) z wypełnionym CmsCompletionTime.
    /// </summary>
    public static string? GetCompletionText(IReadOnlyList<InvestmentTask> tasks)
    {
        return tasks
            .Where(t => !string.IsNullOrWhiteSpace(t.CmsCompletionTime))
            .OrderByDescending(t => t.Ordinal)
            .Select(t => t.CmsCompletionTime.Trim())
            .FirstOrDefault();
    }
}

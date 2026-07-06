using VpRealEstate.Www.Model;

namespace DmWebsite.ViewModels;

public sealed class InvestmentSliderSectionVm
{
    public IReadOnlyList<ListInvestment> Investments { get; init; } = [];
    public IReadOnlyDictionary<int, List<string>> VisualizationsByInvestment { get; init; } = new Dictionary<int, List<string>>();
    public IReadOnlyDictionary<int, InvestmentAggregatedStats> StatsByInvestment { get; init; } = new Dictionary<int, InvestmentAggregatedStats>();
    public IReadOnlyDictionary<int, string?> CompletionByInvestment { get; init; } = new Dictionary<int, string?>();
}

public sealed class InvestmentAggregatedStats
{
    public int TotalPropertiesCount { get; init; }
    public int TotalAvailableCount { get; init; }
    public decimal MinArea { get; init; }
    public decimal MaxArea { get; init; }
    public int MinRooms { get; init; }
    public int MaxRooms { get; init; }
    public int? MinFloor { get; init; }
    public int? MaxFloor { get; init; }
}

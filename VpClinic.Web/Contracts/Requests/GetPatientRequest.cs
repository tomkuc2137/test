#nullable enable

namespace VpClinic.Web.Contracts.Requests;

public class GetPatientRequest
{
    public int PatientId { get; set; }
    public bool IncludeDeleted { get; set; }
}

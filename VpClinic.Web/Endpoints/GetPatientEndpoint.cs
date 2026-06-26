#nullable enable
using FastEndpoints;
using Microsoft.AspNetCore.Http.HttpResults;
using VpClinic.Core.Domains.Patients.AggregatesModel.PatientAggregate;
using VpClinic.Core.Extensions;
using VpClinic.Core.Services;
using VpClinic.Web.Contracts.Requests;
using VpCommon.Web;

namespace VpClinic.Web.Endpoints;

using ResponseType = Results<Ok<Patient>, NotFound>;

public class GetPatientEndpoint : Endpoint<GetPatientRequest, ResponseType>
{
    private readonly IUnitOfWork unitOfWork;
    private readonly IUserAccessor userAccessor;

    public GetPatientEndpoint(IUnitOfWork unitOfWork, IUserAccessor userAccessor)
    {
        this.unitOfWork = unitOfWork;
        this.userAccessor = userAccessor;
    }

    public override void Configure()
    {
        Get("patients/{@patientId}", x => new { x.PatientId });
        Roles(
            Role.SuperAdmin.Id,
            Role.Administrator.Id,
            Role.Manager.Id,
            Role.Reception.Id,
            Role.Doctor.Id,
            Role.Embryologist.Id
        );
    }

    public override async Task<ResponseType> ExecuteAsync(GetPatientRequest req, CancellationToken ct)
    {
        var spec = new PatientSpecification(userAccessor.ClinicGroupId).ById(req.PatientId);
        if (req.IncludeDeleted)
        {
            spec.AllowDeleted();
        }

        var patient = await unitOfWork.GetSingleBySpecAsync(spec, ct);
        if (patient is null)
        {
            return TypedResults.NotFound();
        }

        return TypedResults.Ok(patient);
    }
}

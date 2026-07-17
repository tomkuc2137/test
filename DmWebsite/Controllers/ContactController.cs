using System.Net.Mail;
using DmWebsite.Services;
using Microsoft.AspNetCore.Mvc;
using VpCommon.Services.Email;

namespace DmWebsite.Controllers;

public class ContactFormInput
{
    [FromForm(Name = "formType")]   public string? FormType { get; set; }
    [FromForm(Name = "form_source")] public string? FormSource { get; set; }
    [FromForm(Name = "name")]       public string? Name { get; set; }
    [FromForm(Name = "email")]      public string? Email { get; set; }
    [FromForm(Name = "phone")]      public string? Phone { get; set; }
    [FromForm(Name = "message")]    public string? Message { get; set; }
    [FromForm(Name = "consent")]    public string? Consent { get; set; }
    [FromForm(Name = "company")]    public string? Company { get; set; }
    [FromForm(Name = "loanAmount")]     public string? LoanAmount { get; set; }
    [FromForm(Name = "downPayment")]    public string? DownPayment { get; set; }
    [FromForm(Name = "loanTermMonths")] public string? LoanTermMonths { get; set; }
    [FromForm(Name = "Location")]               public string? Location { get; set; }
    [FromForm(Name = "HasRoadAccess")]          public string? HasRoadAccess { get; set; }
    [FromForm(Name = "HasResidentialZoning")]   public string? HasResidentialZoning { get; set; }
    [FromForm(Name = "Area")]                   public string? Area { get; set; }
    [FromForm(Name = "Price")]                  public string? Price { get; set; }
    [FromForm(Name = "FirstName")]              public string? FirstName { get; set; }
    [FromForm(Name = "LastName")]               public string? LastName { get; set; }
}

[ApiController]
public class ContactController(
    IConfiguration configuration,
    IEmailService emailService,
    ILogger<ContactController> logger) : ControllerBase
{
    [HttpPost("/send-contact")]
    public async Task<IActionResult> Send([FromForm] ContactFormInput input)
    {
        if (!string.IsNullOrWhiteSpace(input.Company))
            return Ok(new { message = "Dziękujemy! Wiadomość została wysłana." });

        var isSkupGruntow = string.Equals(input.FormType, "skup_gruntow", StringComparison.OrdinalIgnoreCase);
        var isFinancing = string.Equals(input.FormType, "financing", StringComparison.OrdinalIgnoreCase);

        var nameToUse = isSkupGruntow ? $"{input.FirstName} {input.LastName}".Trim() : input.Name;

        if (string.IsNullOrWhiteSpace(nameToUse) || string.IsNullOrWhiteSpace(input.Email))
            return BadRequest(new { message = "Uzupełnij wymagane pola." });

        var targetEmail = isFinancing
            ? configuration["ContactForm:FinancingRecipientEmail"]
            : configuration["ContactForm:RecipientEmail"];

        if (string.IsNullOrWhiteSpace(targetEmail))
        {
            logger.LogError("ContactForm:RecipientEmail nie jest skonfigurowany");
            return BadRequest(new { message = "Błąd konfiguracji serwera." });
        }

        var subject = isFinancing ? "Formularz finansowania - prośba o kontakt"
                    : isSkupGruntow ? "Skup gruntów - nowa zgłoszona działka"
                    : "Formularz kontaktowy - prośba o kontakt";

        var siteTitle = configuration["ContactForm:SiteTitle"] ?? "Forma Development";
        var siteUrl = configuration["ContactForm:SiteUrl"];

        var body = ContactEmailTemplate.Build(
            input, nameToUse, isSkupGruntow, isFinancing, subject, siteTitle, siteUrl);

        try
        {
            var message = new MailMessage
            {
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            message.To.Add(targetEmail);
            message.ReplyToList.Add(input.Email!);
            await emailService.SendEmail(message);
        }
        catch (Exception e)
        {
            logger.LogError(e, "Błąd wysyłki maila (formularz kontaktowy)");
            return BadRequest(new { message = "Nie udało się wysłać wiadomości. Spróbuj ponownie." });
        }

        return Ok(new { message = "Dziękujemy! Skontaktujemy się z Tobą wkrótce." });
    }
}

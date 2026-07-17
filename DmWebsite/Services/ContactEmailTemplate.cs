using System.Net;
using System.Text;
using DmWebsite.Controllers;

namespace DmWebsite.Services;

public static class ContactEmailTemplate
{
    public static string Build(
        ContactFormInput input,
        string nameToUse,
        bool isSkupGruntow,
        bool isFinancing,
        string subject,
        string? siteTitle = null,
        string? siteUrl = null)
    {
        siteTitle ??= "Forma Development";
        siteUrl ??= string.Empty;

        var rows = new List<(string Label, string? Value)>
        {
            ("Imię i nazwisko", nameToUse),
            ("E-mail", input.Email),
        };

        if (!string.IsNullOrWhiteSpace(input.Phone))
            rows.Add(("Telefon", input.Phone));

        if (isSkupGruntow)
        {
            rows.Add(("Lokalizacja", input.Location));
            rows.Add(("Powierzchnia", FormatWithUnit(input.Area, "m²")));
            rows.Add(("Proponowana cena", FormatWithUnit(input.Price, "zł")));
            rows.Add(("Dostęp do drogi publicznej", FormatBool(input.HasRoadAccess)));
            rows.Add(("Pod zabudowę mieszkaniową", FormatBool(input.HasResidentialZoning)));
        }
        else if (isFinancing)
        {
            rows.Add(("Kwota kredytu", FormatWithUnit(input.LoanAmount, "zł")));
            rows.Add(("Wkład własny", FormatWithUnit(input.DownPayment, "zł")));
            rows.Add(("Okres kredytu", FormatWithUnit(input.LoanTermMonths, "msc")));
        }

        if (!string.IsNullOrWhiteSpace(input.FormSource))
            rows.Add(("Źródło formularza", input.FormSource));

        var body = new StringBuilder();
        body.AppendLine("<!DOCTYPE html>");
        body.AppendLine("<html lang=\"pl\">");
        body.AppendLine("<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>");
        body.AppendLine("<body style=\"margin:0;padding:0;background-color:#f4f5f7;font-family:Inter,Arial,Helvetica,sans-serif;color:#151515;\">");
        body.AppendLine("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#f4f5f7;padding:32px 16px;\">");
        body.AppendLine("<tr><td align=\"center\">");
        body.AppendLine("<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;\">");

        body.AppendLine("<tr><td style=\"background-color:#151515;padding:24px 28px;\">");
        body.AppendLine($"<p style=\"margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#C6A87C;\">{Encode(siteTitle)}</p>");
        body.AppendLine($"<p style=\"margin:0;font-size:20px;font-weight:700;line-height:1.3;color:#ffffff;\">{Encode(subject)}</p>");
        body.AppendLine("</td></tr>");

        body.AppendLine("<tr><td style=\"padding:28px;\">");
        body.AppendLine("<p style=\"margin:0 0 6px;font-size:13px;color:#6b7280;\">Nadawca</p>");
        body.AppendLine($"<p style=\"margin:0 0 24px;font-size:15px;line-height:1.5;color:#151515;\"><strong>{Encode(nameToUse)}</strong> &lt;{Encode(input.Email)}&gt;</p>");

        body.AppendLine("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border-top:1px solid #e5e7eb;\">");
        foreach (var (label, value) in rows.Where(r => !string.IsNullOrWhiteSpace(r.Value)))
            AppendRow(body, label, value!);
        body.AppendLine("</table>");

        if (!string.IsNullOrWhiteSpace(input.Message))
        {
            body.AppendLine("<p style=\"margin:24px 0 8px;font-size:13px;color:#6b7280;\">Treść wiadomości</p>");
            body.AppendLine($"<div style=\"padding:16px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;line-height:1.6;color:#151515;white-space:pre-wrap;\">{Encode(input.Message)}</div>");
        }

        body.AppendLine("</td></tr>");

        body.AppendLine("<tr><td style=\"padding:20px 28px;background-color:#f9fafb;border-top:1px solid #e5e7eb;\">");
        body.AppendLine("<p style=\"margin:0;font-size:12px;line-height:1.6;color:#9ca3af;\">");
        body.AppendLine($"To jest powiadomienie o przesłaniu formularza na stronie <strong style=\"color:#6b7280;\">{Encode(siteTitle)}</strong>");
        if (!string.IsNullOrWhiteSpace(siteUrl))
            body.AppendLine($" (<a href=\"{EncodeAttribute(siteUrl)}\" style=\"color:#C6A87C;text-decoration:none;\">{Encode(siteUrl)}</a>)");
        body.AppendLine(".</p>");
        body.AppendLine("</td></tr>");

        body.AppendLine("</table>");
        body.AppendLine("</td></tr></table>");
        body.AppendLine("</body></html>");

        return body.ToString();
    }

    private static void AppendRow(StringBuilder body, string label, string value)
    {
        body.AppendLine("<tr>");
        body.AppendLine($"<td style=\"padding:14px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;vertical-align:top;width:42%;\">{Encode(label)}</td>");
        body.AppendLine($"<td style=\"padding:14px 0 14px 16px;border-bottom:1px solid #e5e7eb;font-size:15px;color:#151515;vertical-align:top;\">{Encode(value)}</td>");
        body.AppendLine("</tr>");
    }

    private static string FormatWithUnit(string? value, string unit) =>
        string.IsNullOrWhiteSpace(value) ? string.Empty : $"{value.Trim()} {unit}";

    private static string FormatBool(string? value) =>
        string.Equals(value, "true", StringComparison.OrdinalIgnoreCase) ? "Tak" : "Nie";

    private static string Encode(string? text) => WebUtility.HtmlEncode(text ?? string.Empty);

    private static string EncodeAttribute(string text) => WebUtility.HtmlEncode(text);
}

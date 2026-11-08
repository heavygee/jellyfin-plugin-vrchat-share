using Jellyfin.Plugin.VrchatShare.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.VrchatShare.Controllers;

/// <summary>
/// Public config + client script endpoints for the Share in VRChat UI hook.
/// </summary>
[ApiController]
[Route("VrchatShare")]
public class VrchatShareController : ControllerBase
{
    /// <summary>
    /// Returns the current deeplink configuration for the injected client script.
    /// </summary>
    [HttpGet("config")]
    [AllowAnonymous]
    public ActionResult<object> GetConfig()
    {
        var cfg = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        return Ok(new
        {
            enabled = cfg.Enabled,
            baseUrl = (cfg.BaseUrl ?? string.Empty).TrimEnd('/'),
            openInNewTab = cfg.OpenInNewTab
        });
    }

    /// <summary>
    /// Serves the embedded client script (also registered via JS Injector when present).
    /// </summary>
    [HttpGet("script.js")]
    [AllowAnonymous]
    public IActionResult GetScript()
    {
        var assembly = typeof(Plugin).Assembly;
        var resourceName = $"{typeof(Plugin).Namespace}.Web.vrchat-share.js";
        var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream is null)
        {
            return NotFound();
        }

        return File(stream, "application/javascript; charset=utf-8");
    }
}

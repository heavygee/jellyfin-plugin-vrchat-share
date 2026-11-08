using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.VrchatShare.Configuration;

/// <summary>
/// Plugin configuration for VRChat share deeplinks.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Gets or sets whether the Share in VRChat menu action is enabled.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Gets or sets the vrchat-jellyfin public base URL (no trailing slash).
    /// Deeplink target is <c>{BaseUrl}/item/{jellyfinItemId}</c>.
    /// </summary>
    public string BaseUrl { get; set; } = "https://vrchat.introvrtlounge.com";

    /// <summary>
    /// Gets or sets whether to open the deeplink in a new browser tab.
    /// </summary>
    public bool OpenInNewTab { get; set; } = true;
}

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
    /// Must be set by the admin; there is no production default in the published plugin.
    /// </summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets whether to open the deeplink in a new browser tab.
    /// </summary>
    public bool OpenInNewTab { get; set; } = true;
}

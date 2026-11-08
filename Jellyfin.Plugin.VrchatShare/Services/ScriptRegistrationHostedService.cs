using System.Reflection;
using System.Text;
using Jellyfin.Plugin.VrchatShare.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.VrchatShare.Services;

/// <summary>
/// Soft-registers the client script with n00bcodr JavaScript Injector when that plugin is installed.
/// Falls back to loading <c>/VrchatShare/script.js</c> via a tiny Injector stub, or manual install.
/// </summary>
public sealed class ScriptRegistrationHostedService : IHostedService
{
    private const string ScriptId = "heavygee-vrchat-share";
    private readonly ILogger<ScriptRegistrationHostedService> _logger;
    private readonly IServiceProvider _services;

    /// <summary>
    /// Initializes a new instance of the <see cref="ScriptRegistrationHostedService"/> class.
    /// </summary>
    public ScriptRegistrationHostedService(ILogger<ScriptRegistrationHostedService> logger, IServiceProvider services)
    {
        _logger = logger;
        _services = services;
    }

    /// <inheritdoc />
    public Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            RegisterWithJavaScriptInjector();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "VRChat Share: could not register with JavaScript Injector (optional dependency)");
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private void RegisterWithJavaScriptInjector()
    {
        // Soft dependency: resolve by interface name so we do not reference the Injector assembly.
        object? registration = null;
        foreach (var service in GetAllServicesSafe())
        {
            if (service is null)
            {
                continue;
            }

            var typeName = service.GetType().FullName ?? string.Empty;
            var ifaces = service.GetType().GetInterfaces().Select(i => i.FullName ?? string.Empty);
            if (typeName.Contains("JavaScriptRegistrationService", StringComparison.Ordinal)
                || ifaces.Any(i => i.Contains("IJavaScriptRegistrationService", StringComparison.Ordinal)))
            {
                registration = service;
                break;
            }
        }

        if (registration is null)
        {
            _logger.LogInformation(
                "VRChat Share: JavaScript Injector not found. Load /VrchatShare/script.js via JS Injector manually, or install n00bcodr JavaScript Injector.");
            return;
        }

        var script = LoadEmbeddedScript();
        var cfg = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        // Prefetch config into the script so the menu works even if the API route is blocked.
        var boot = new StringBuilder();
        boot.AppendLine("(function(){");
        boot.Append("window.__VRCHAT_SHARE_BOOT__=");
        boot.Append(System.Text.Json.JsonSerializer.Serialize(new
        {
            enabled = cfg.Enabled,
            baseUrl = (cfg.BaseUrl ?? string.Empty).TrimEnd('/'),
            openInNewTab = cfg.OpenInNewTab
        }));
        boot.AppendLine(";");
        boot.AppendLine("})();");
        boot.AppendLine(script);

        var payloadType = registration.GetType().Assembly
            .GetTypes()
            .FirstOrDefault(t => t.Name == "JavaScriptRegistrationPayload");
        if (payloadType is null)
        {
            _logger.LogWarning("VRChat Share: JavaScriptRegistrationPayload type not found");
            return;
        }

        var payload = Activator.CreateInstance(payloadType);
        if (payload is null)
        {
            return;
        }

        SetProp(payload, "Id", ScriptId);
        SetProp(payload, "Name", "VRChat Share");
        SetProp(payload, "Script", boot.ToString());
        SetProp(payload, "Enabled", true);
        SetProp(payload, "PluginId", Plugin.Instance?.Id.ToString("N"));
        SetProp(payload, "PluginName", "VRChat Share");
        SetProp(payload, "PluginVersion", "0.1.0.0");

        var method = registration.GetType().GetMethod("RegisterScript", BindingFlags.Instance | BindingFlags.Public);
        if (method is null)
        {
            _logger.LogWarning("VRChat Share: RegisterScript method not found on Injector service");
            return;
        }

        var ok = method.Invoke(registration, [payload]);
        _logger.LogInformation("VRChat Share: JavaScript Injector registration result={Result}", ok);
    }

    private IEnumerable<object?> GetAllServicesSafe()
    {
        // Best-effort scan of root provider; Injector registers as singleton.
        if (_services is IServiceProvider root)
        {
            // Cannot enumerate all services portably; try GetService by scanning loaded assemblies for the interface.
            foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
            {
                Type? iface = null;
                try
                {
                    iface = asm.GetTypes().FirstOrDefault(t => t.Name == "IJavaScriptRegistrationService" && t.IsInterface);
                }
                catch (ReflectionTypeLoadException)
                {
                    continue;
                }

                if (iface is null)
                {
                    continue;
                }

                var svc = root.GetService(iface);
                if (svc is not null)
                {
                    yield return svc;
                }
            }
        }
    }

    private static string LoadEmbeddedScript()
    {
        var assembly = typeof(Plugin).Assembly;
        var resourceName = $"{typeof(Plugin).Namespace}.Web.vrchat-share.js";
        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Missing embedded resource {resourceName}");
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    private static void SetProp(object target, string name, object? value)
    {
        var prop = target.GetType().GetProperty(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.IgnoreCase);
        if (prop is null || !prop.CanWrite)
        {
            return;
        }

        if (value is null)
        {
            prop.SetValue(target, null);
            return;
        }

        if (prop.PropertyType.IsInstanceOfType(value))
        {
            prop.SetValue(target, value);
            return;
        }

        if (prop.PropertyType == typeof(string))
        {
            prop.SetValue(target, value.ToString());
        }
    }
}

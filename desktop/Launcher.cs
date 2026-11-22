using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("Do Zero ao Canadá - Portal de Francês & TCF")]
[assembly: AssemblyDescription("Aplicativo Desktop e Inicializador Background - Do Zero ao Canadá")]
[assembly: AssemblyCompany("Filipe Roberto")]
[assembly: AssemblyProduct("Do Zero ao Canadá B2")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace DoZeroAoCanada
{
    static class Program
    {
        private const int PORT = 5173;
        private const string APP_URL = "http://localhost:5173";

        [STAThread]
        static void Main(string[] args)
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string serverScript = Path.Combine(appDir, "server-local.cjs");
            string pidFile = Path.Combine(appDir, ".server.pid");

            bool backgroundOnly = false;
            bool stopServer = false;

            foreach (string arg in args)
            {
                string a = (arg ?? "").Trim().ToLowerInvariant();
                if (a == "--background-only" || a == "--silent" || a == "-b")
                {
                    backgroundOnly = true;
                }
                else if (a == "--stop" || a == "-s")
                {
                    stopServer = true;
                }
            }

            if (stopServer)
            {
                StopBackgroundServer(pidFile);
                return;
            }

            // 1. Verifica se o servidor já está rodando na porta 5173; se não estiver, inicia invisível
            if (!IsPortOpen("127.0.0.1", PORT))
            {
                if (!File.Exists(serverScript))
                {
                    if (!backgroundOnly)
                    {
                        MessageBox.Show(
                            "O arquivo 'server-local.cjs' não foi encontrado na pasta do aplicativo:\n" + appDir,
                            "Do Zero ao Canadá",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error
                        );
                    }
                    return;
                }

                string nodeExe = FindNodeExecutable();
                if (string.IsNullOrEmpty(nodeExe))
                {
                    if (!backgroundOnly)
                    {
                        MessageBox.Show(
                            "O Node.js não foi encontrado no sistema para iniciar o servidor local invisível.",
                            "Do Zero ao Canadá",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error
                        );
                    }
                    return;
                }

                StartHiddenNodeServer(nodeExe, serverScript, appDir);

                // Aguarda até 4 segundos para o servidor responder na porta 5173
                for (int i = 0; i < 40; i++)
                {
                    if (IsPortOpen("127.0.0.1", PORT))
                    {
                        break;
                    }
                    Thread.Sleep(100);
                }
            }

            // 2. Se foi chamado apenas para manter o servidor em background (ex: Inicialização do Windows), encerra aqui
            if (backgroundOnly)
            {
                return;
            }

            // 3. Abre a janela nativa em modo App Desktop (--app=http://localhost:5173) sem barra de endereços
            LaunchDesktopAppWindow(APP_URL);
        }

        private static bool IsPortOpen(string host, int port)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(180));
                    if (!success)
                    {
                        return false;
                    }
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        private static string FindNodeExecutable()
        {
            string[] candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe"),
                @"C:\Program Files\nodejs\node.exe",
                @"C:\Program Files (x86)\nodejs\node.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "nvm", "current", "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "nodejs", "node.exe")
            };

            foreach (string path in candidates)
            {
                if (!string.IsNullOrEmpty(path) && File.Exists(path))
                {
                    return path;
                }
            }

            // Procura no PATH do sistema
            string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string dir in pathEnv.Split(Path.PathSeparator))
            {
                try
                {
                    if (string.IsNullOrWhiteSpace(dir)) continue;
                    string fullPath = Path.Combine(dir.Trim(), "node.exe");
                    if (File.Exists(fullPath))
                    {
                        return fullPath;
                    }
                }
                catch { }
            }

            return "node.exe";
        }

        private static void StartHiddenNodeServer(string nodeExe, string serverScript, string workingDir)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = nodeExe,
                    Arguments = "\"" + serverScript + "\"",
                    WorkingDirectory = workingDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Falha ao iniciar o servidor em segundo plano:\n" + ex.Message,
                    "Do Zero ao Canadá",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static void StopBackgroundServer(string pidFile)
        {
            try
            {
                if (File.Exists(pidFile))
                {
                    string pidText = File.ReadAllText(pidFile).Trim();
                    int pid;
                    if (int.TryParse(pidText, out pid))
                    {
                        try
                        {
                            Process proc = Process.GetProcessById(pid);
                            proc.Kill();
                        }
                        catch { }
                    }
                    File.Delete(pidFile);
                }
            }
            catch { }
        }

        private static void LaunchDesktopAppWindow(string url)
        {
            string[] browserCandidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe")
            };

            foreach (string browser in browserCandidates)
            {
                if (!string.IsNullOrEmpty(browser) && File.Exists(browser))
                {
                    try
                    {
                        ProcessStartInfo psi = new ProcessStartInfo
                        {
                            FileName = browser,
                            Arguments = "--app=" + url,
                            UseShellExecute = true
                        };
                        Process.Start(psi);
                        return;
                    }
                    catch { }
                }
            }

            // Fallback: abre no navegador padrão do sistema
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                });
            }
            catch { }
        }
    }
}


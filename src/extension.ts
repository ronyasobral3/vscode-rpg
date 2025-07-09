import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const provider = new rpgViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      rpgViewProvider.viewType,
      provider
    )
  );
}

class rpgViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "rpg";

  private _view?: vscode.WebviewView;
  private monsterLife: number = 30;
  private monsterImg: string = "Icon";
  private range1to10: number = 1;
  private monsterView: string = "";

  constructor(private readonly _extensionUri: vscode.Uri) {
    this.monsterView = this.monsterImg + this.range1to10.toString() + ".png";
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, "media")],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Escuta as alterações feitas no texto
    vscode.workspace.onDidChangeTextDocument((event) => {
      this.monsterLife--;

      this.updateMonsterStyle();
      this.updateMonsterLife(this.monsterLife);

      if (this.monsterLife === 0) {
        this.changeMonster();
        this.resetMonsterLife();
      }
    });
  }

  private updateMonsterStyle() {
    const webview = this._view?.webview;

    if (webview) {
      webview.postMessage({
        command: "updateMonsterStyle",
      });
    }
  }

  private updateMonsterLife(lifePoint: number) {
    const webview = this._view?.webview;

    if (webview) {
      webview.postMessage({ command: "updateMonsterLife", value: lifePoint });
    }
  }

  private changeMonster() {
    const webview = this._view?.webview;

    this.range1to10 = this.getRandomInt(1, 10);
    this.monsterView = this.monsterImg + this.range1to10.toString() + ".png";

    if (webview) {
      const imageUri = webview.asWebviewUri(
        vscode.Uri.joinPath(
          this._extensionUri,
          "media",
          "monster",
          this.monsterView
        )
      );

      webview.postMessage({
        command: "changeMonster",
        value: imageUri.toString(),
      });
    }
  }

  private resetMonsterLife() {
    this.monsterLife = 30;
    this.updateMonsterLife(this.monsterLife);
  }

  private getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.js")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.css")
    );
    const styleHealthUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "healthbar.css")
    );
    const imageMonsterUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "media",
        "monster",
        this.monsterView
      )
    );

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src ${webview.cspSource};">
				<link href="${styleMainUri}" rel="stylesheet">
				<link href="${styleHealthUri}" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
				<title>RPG</title>
			</head>
			<body id="body">
      <button class="tooltip">?
      <span class="tooltiptext">
        Monster by: <a href="https://craftpix.net">Craftpix</a>
      </span>
      </button>
				<div class="box">

					<div style="display: block;">
						<div style="display: flex; justify-content: center; width: 100%;">
						<img id="monster" class="monster pulse" src="${imageMonsterUri}" alt="Monster" />
						</div>
					</div>

						<div class="health-bar">
							<div class="health-indicator">
								<div class="hit"></div>
							</div>
						</div>

				</div>

				<script src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}

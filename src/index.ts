import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import { NotebookPanel } from '@jupyterlab/notebook';

import { INotebookContent } from '@jupyterlab/nbformat';

import { Token } from '@lumino/coreutils';

import { requestAPI } from './handler';

const PLUGIN_ID = 'telemetry-router:plugin';

export const ITelemetryRouter = new Token<ITelemetryRouter>(PLUGIN_ID)

export interface ITelemetryRouter {
  loadNotebookPanel(notebookPanel: NotebookPanel): void;
  publishEvent(eventDetail: Object, logNotebookContent?: Boolean): void;
}

export class TelemetryRouter implements ITelemetryRouter {
  private sessionID?: string;
  private notebookPanel?: NotebookPanel;
  private workspaceID?: string;

  async loadNotebookPanel(notebookPanel: NotebookPanel) {
    this.notebookPanel = notebookPanel
    this.workspaceID = await requestAPI<any>('env')
  }

  async publishEvent(eventDetail: Object, logNotebookContent?: Boolean) {
    // Check if session id received is equal to the stored session id
    if (!this.sessionID || this.sessionID !== this.notebookPanel?.sessionContext.session?.id) {
      this.sessionID = this.notebookPanel?.sessionContext.session?.id
    }

    // Construct data
    const requestBody = {
      eventDetail: eventDetail,
      notebookState: {
        sessionID: this.sessionID,
        workspaceID: this.workspaceID,
        notebookPath: this.notebookPanel?.context.path,
        notebookContent: logNotebookContent ? this.notebookPanel?.model?.toJSON() as INotebookContent : null
      },
    }

    // Send to backend consumer
    const consumerResponse = await requestAPI<any>('consume', { method: 'POST', body: JSON.stringify(requestBody) })
    console.log(requestBody, consumerResponse)
  }
}

const plugin: JupyterFrontEndPlugin<TelemetryRouter> = {
  id: PLUGIN_ID,
  description: 'A JupyterLab extension.',
  provides: ITelemetryRouter,
  autoStart: true,
  activate: async (app: JupyterFrontEnd) => {
    const version = await requestAPI<string>('version')
    console.log(`${PLUGIN_ID}: ${version}`)

    const telemetryRouter = new TelemetryRouter();

    return telemetryRouter;
  }
};

export default plugin;

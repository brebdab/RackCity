import {
  Alert,
  AnchorButton,
  Button,
  ButtonGroup,
  Classes,
  Dialog,
  Overlay,
  IToastProps,
  Toaster,
  Spinner,
  Intent,
  Position, Callout, Card,
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../utils/api-config";
import { FileSelector } from "../lib/fileSelect";
import "./import.scss";
import InstructionsLite from "./importInstructionsLite";
import { Modifier } from "./viewModified";
import { TableType } from "../../utils/utils";
import * as actions from "../../store/actions/state";

var console: any = {};
console.log = function () {};
interface ImportProps {
  token: string;
  markTablesStale(staleTables: TableType[]): void;
}

interface AlertState {
  uploadFileIsOpen: boolean;
  modelAlterationsIsOpen: boolean;
  assetAlterationsIsOpen: boolean;
  networkAlterationsIsOpen: boolean;
  selectedFile?: File;
  encodedFile?: string;
  loadedModels: any;
  loadedAssets: any;
  modifiedModels?: Array<any>;
  modifiedAssets?: Array<any>;
  modifiedNetwork?: Array<any>;
  ignoredModels?: number;
  ignoredAssets?: number;
  ignoredNetwork?: number;
  addedModels?: number;
  addedAssets?: number;
  addedNetwork?: number;
  uploading: boolean;
  notify: boolean;
  assetUploadType: string;
}

export class BulkImport extends React.PureComponent<
  RouteComponentProps & ImportProps,
  AlertState
> {
  public state: AlertState = {
    uploadFileIsOpen: false,
    modelAlterationsIsOpen: false,
    assetAlterationsIsOpen: false,
    networkAlterationsIsOpen: false,
    loadedModels: [],
    loadedAssets: [],
    uploading: false,
    notify: false,
    assetUploadType: "assets",
  };

  private toaster: Toaster = {} as Toaster;
  private addSuccessToast(message: string) {
    this.addToast({ message: message, intent: Intent.PRIMARY });
  }
  private addErrorToast(message: string) {
    this.addToast({ message: message, intent: Intent.DANGER });
  }
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }
  private addWarnToast = (message: string) => {
    this.addToast({
      message: message,
      intent: Intent.WARNING,
    });
  };
  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
  };

  private createAlertToasts(toasts: Array<string>, types: Array<string>) {
    for (let i = 0; i < toasts.length; i++) {
      if (types[i] === Intent.SUCCESS) {
        this.addSuccessToast(toasts[i]);
      } else if (types[i] === Intent.WARNING) {
        this.addWarnToast(toasts[i]);
      } else if (types[i] === Intent.DANGER) {
        this.addErrorToast(toasts[i]);
      }
    }
  }

  render() {
    let params: any;
    params = this.props.match.params;
    const resourceType: string = params.resourceType;
    console.log("params");
    console.log(params);
    //const resourceType = params.resourceType;
    //console.log("resourceType")
    console.log(resourceType);
    const uploadType =
      resourceType === "models" ? resourceType : this.state.assetUploadType;
    const selectButtonText = "Select " + uploadType + " file";
    return (
      <div className={Classes.DARK + " import"}>



        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />

                  <Card className="instructions-card"><h3>Bulk Import</h3>
            {resourceType === "assets" ? (
              <div className={"import-buttons-asset"}>
                <ButtonGroup>
                <Button
                  className="import-button"
                  active={this.state.assetUploadType === "assets"}
                  text="assets"
                  onClick={(e: any) => {
                    this.setState({ assetUploadType: "assets" });
                  }}
                />
                <Button
                  className="import-button"
                  active={this.state.assetUploadType === "network connections"}
                  text="network connections"
                  onClick={(e: any) => {
                    this.setState({ assetUploadType: "network connections" });
                  }}
                />
                      </ButtonGroup>
              </div>

            ) : null}
            <div className={"import-buttons-asset"}>
             <AnchorButton
              className="import-button"

              intent="primary"
              icon="import"
              text={selectButtonText}
              onClick={this.handleFilepickerOpen}
            />
            </div>
            <Overlay
              isOpen={this.state.uploading}
              className={"uploading-overlay"}
            >
              {" "}
            </Overlay>
            <Alert
              cancelButtonText="Cancel"
              confirmButtonText="Confirm Upload"
              intent="primary"
              isOpen={this.state.uploadFileIsOpen}
              onCancel={this.handleFilepickerCancel}
              onConfirm={this.handleFileUpload}
            >
              <p>Choose a file</p>
              <FileSelector {...this.props} callback={this.setFile} />
            </Alert>
            {this.state.uploading ? (
              <div>
                <p>Uploading data...</p>
                <Spinner size={Spinner.SIZE_STANDARD} />
              </div>
            ) : null}
            </Card>


        <div className={"row"}>
          <div className={"column-third-import"}>
            <p> </p>

          </div>
        </div>

        <div>
          <Dialog
            isOpen={this.state.modelAlterationsIsOpen}
            onClose={() =>
              this.setState({
                modelAlterationsIsOpen: false,
                loadedModels: undefined,
                modifiedModels: undefined,
              })
            }
            className={Classes.DARK + " modify-table"}
            usePortal={true}
            isCloseButtonShown={true}
            title={"Model Modifications Menu"}
          >
            <Modifier
              {...this.props}
              modelsModified={this.state.modifiedModels}
              modelsAdded={this.state.addedModels}
              modelsIgnored={this.state.ignoredModels}
              callback={(toast: Array<string>, messageType: Array<string>) => {
                this.setState({
                  modelAlterationsIsOpen: false,
                  modifiedModels: undefined,
                  loadedModels: undefined,
                });
                console.log(this.state);
                this.createAlertToasts(toast, messageType);
              }}
              operation={"models"}
            />
          </Dialog>
          <Alert
            isOpen={this.state.notify}
            confirmButtonText="OK"
            onClose={() => this.setState({ notify: false })}
          >
            <p>Hello</p>
          </Alert>
        </div>
        <div>
          <Dialog
            isOpen={this.state.assetAlterationsIsOpen}
            onClose={() =>
              this.setState({
                assetAlterationsIsOpen: false,
                loadedAssets: undefined,
                modifiedAssets: undefined,
              })
            }
            className={Classes.DARK + " modify-table"}
            usePortal={true}
            isCloseButtonShown={true}
            title={"Asset Modifications Menu"}
          >
            <Modifier
              {...this.props}
              modelsModified={this.state.modifiedAssets}
              modelsAdded={this.state.addedAssets}
              modelsIgnored={this.state.ignoredAssets}
              callback={(toast: Array<string>, messageType: Array<string>) => {
                this.setState({
                  assetAlterationsIsOpen: false,
                  modifiedAssets: undefined,
                  loadedAssets: undefined,
                });
                this.createAlertToasts(toast, messageType);
              }}
              operation={"assets"}
            />
          </Dialog>
        </div>
        <div>
          <Dialog
            isOpen={this.state.networkAlterationsIsOpen}
            onClose={() =>
              this.setState({
                networkAlterationsIsOpen: false,
                modifiedNetwork: undefined,
              })
            }
            className={Classes.DARK + " modify-table"}
            usePortal={true}
            isCloseButtonShown={true}
            title={"Network Connections Modifications Menu"}
          >
            <Modifier
              {...this.props}
              modelsModified={this.state.modifiedNetwork}
              modelsAdded={this.state.addedNetwork}
              modelsIgnored={this.state.ignoredNetwork}
              callback={(toast: Array<string>, messageType: Array<string>) => {
                this.setState({
                  networkAlterationsIsOpen: false,
                  modifiedNetwork: undefined,
                });
                this.createAlertToasts(toast, messageType);
              }}
              operation={"network"}
            />
          </Dialog>
        </div>
        <InstructionsLite uploadType={uploadType} />
      </div>
    );
  }

  private handleFilepickerOpen = () =>
    this.setState({ uploadFileIsOpen: true });
  private handleFilepickerCancel = () =>
    this.setState({ uploadFileIsOpen: false });

  /*
   * serializes data to JSON and
   * makes backend requests
   */
  private handleFileUpload = () => {
    /* Encode to base64 */
    this.setState({ encodedFile: undefined });
    if (this.state.selectedFile !== undefined) {
      getBase64(this.state.selectedFile).then(
        (res: any) => {
          this.setState({
            encodedFile: res,
          });
          this.handleUpload(res);
        },
        (err) => {
          this.addErrorToast(err.response.data.failure_message);
        }
      );
      this.setState({ uploadFileIsOpen: false });
    } else {
      this.addErrorToast("No file selected");
    }
  };

  private handleUpload = (encodedFile: any) => {
    let params: any;
    params = this.props.match.params;
    const resourceType: string = params.resourceType;
    const uploadType =
      resourceType === "models" ? resourceType : this.state.assetUploadType;
    console.log(encodedFile);
    if (encodedFile !== undefined) {
      this.setState({ uploading: true });
      uploadBulk(encodedFile, this.props.token, uploadType).then(
        (res) => {
          console.log(res);
          if (res.modifications.length !== 0) {
            console.log(res.modifications);
            if (uploadType === "models") {
              this.setState({
                modelAlterationsIsOpen: true,
                uploading: false,
                modifiedModels: res.modifications,
                ignoredModels: res.ignored,
                addedModels: res.added,
              });
            } else if (uploadType === "assets") {
              this.setState({
                assetAlterationsIsOpen: true,
                uploading: false,
                modifiedAssets: res.modifications,
                ignoredAssets: res.ignored,
                addedAssets: res.added,
              });
            } else {
              this.setState({
                networkAlterationsIsOpen: true,
                uploading: false,
                modifiedNetwork: res.modifications,
                ignoredNetwork: res.ignored,
                addedNetwork: res.added,
              });
            }
          } else {
            this.props.markTablesStale([
              TableType.RACKED_ASSETS,
              TableType.STORED_ASSETS,
              TableType.MODELS,
            ]);
            this.addSuccessToast(
              "Success! Modified: 0; Added: " +
                res.added +
                "; Ignored: " +
                res.ignored
            );
            if (params.resourceType === "models") {
              this.setState({ uploading: false, loadedModels: undefined });
            } else {
              this.setState({ uploading: false, loadedAssets: undefined });
            }
          }
        },
        (err) => {
          this.setState({ uploading: false });
          this.addErrorToast(err.response.data.failure_message);
        }
      );
    } else {
      this.addWarnToast("No data to upload");
    }
    console.log("here, regardless of error or success");
    this.setState({
      loadedModels: undefined,
      loadedAssets: undefined,
      modifiedModels: undefined,
      modifiedAssets: undefined,
    });
  };

  /*
   * Set file from fileSelect component
   * to state in this component
   */
  private setFile = (file: File) => {
    this.setState({
      selectedFile: file,
    });
  };
}

async function uploadBulk(encodedFile: string, token: string, type: string) {
  const url =
    type === "network connections"
      ? API_ROOT + "api/assets/network-bulk-upload"
      : API_ROOT + "api/" + type + "/bulk-upload";
  console.log(url);
  console.log(token);
  const headers = {
    headers: {
      Authorization: "Token " + token,
    },
  };
  const postBody = { import_csv: encodedFile };
  return await axios.post(url, postBody, headers).then((res) => {
    console.log(res.data);
    const data = res.data;
    return data;
  });
}

async function getBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let content = "";
    reader.onload = function (e: any) {
      content = e.target.result;
      const result = content;
      resolve(result);
    };
    reader.onerror = function (e: any) {
      reject(e);
    };
    reader.readAsDataURL(file);
  });
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    markTablesStale: (staleTables: TableType[]) =>
      dispatch(actions.markTablesStale(staleTables)),
  };
};

export default withRouter(
  connect(mapStatetoProps, mapDispatchToProps)(BulkImport)
);

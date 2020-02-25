import {
  Alert,
  AnchorButton,
  Button,
  ButtonGroup,
  Classes,
  Dialog,
  Overlay,
  Spinner
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../utils/api-config";
import { FileSelector } from "../lib/fileSelect";
import "./import.scss";
import Instructions from "./importInstructions";
import { Modifier } from "./viewModified";

//var console: any = {};
//console.log = function () { };
interface ImportProps {
  token: string;
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
    assetUploadType: "assets"
  };

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
        <div className={"row"}>
          <div className={"column-third-import"}>
            {resourceType === "assets" ? (
              <ButtonGroup fill={false} style={{ marginTop: 10 }}>
                <Button
                  active={this.state.assetUploadType === "assets"}
                  text="assets"
                  onClick={(e: any) => {
                    this.setState({ assetUploadType: "assets" });
                  }}
                />
                <Button
                  active={this.state.assetUploadType === "network connections"}
                  text="network connections"
                  onClick={(e: any) => {
                    this.setState({ assetUploadType: "network connections" });
                  }}
                />
              </ButtonGroup>
            ) : null}
          </div>
        </div>
        <div className={"row"}>
          <div className={"column-third-import"}>
            <p> </p>
            <AnchorButton
              large={true}
              intent="primary"
              icon="import"
              minimal
              text={selectButtonText}
              onClick={this.handleFilepickerOpen}
            />
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
          </div>
        </div>

        <div>
          <Dialog
            isOpen={this.state.modelAlterationsIsOpen}
            onClose={() =>
              this.setState({
                modelAlterationsIsOpen: false,
                loadedModels: undefined,
                modifiedModels: undefined
              })
            }
            className={"modify-table"}
            usePortal={true}
            isCloseButtonShown={true}
            title={"Model Alterations Menu"}
          >
            <Modifier
              {...this.props}
              modelsModified={this.state.modifiedModels}
              modelsAdded={this.state.addedModels}
              modelsIgnored={this.state.ignoredModels}
              callback={() => {
                this.setState({
                  modelAlterationsIsOpen: false,
                  modifiedModels: undefined,
                  loadedModels: undefined
                });
                console.log(this.state);
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
                modifiedAssets: undefined
              })
            }
            className={Classes.DARK + "modify-table"}
            usePortal={true}
            isCloseButtonShown={true}
            title={"Asset Modifications Menu"}
          >
            <Modifier
              {...this.props}
              modelsModified={this.state.modifiedAssets}
              modelsAdded={this.state.addedAssets}
              modelsIgnored={this.state.ignoredAssets}
              callback={() => {
                this.setState({
                  assetAlterationsIsOpen: false,
                  modifiedAssets: undefined,
                  loadedAssets: undefined
                });
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
                modifiedNetwork: undefined
              })
            }
            className={"modify-table"}
            usePortal={true}
            isCloseButtonShown={true}
            title={"Network Connections Alterations Menu"}
          >
            <Modifier
              {...this.props}
              modelsModified={this.state.modifiedNetwork}
              modelsAdded={this.state.addedNetwork}
              modelsIgnored={this.state.ignoredNetwork}
              callback={() => {
                this.setState({
                  networkAlterationsIsOpen: false,
                  modifiedNetwork: undefined
                });
              }}
              operation={"network"}
            />
          </Dialog>
        </div>
        <Instructions />
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
            encodedFile: res
          });
          this.handleUpload(res);
        },
        err => {
          alert(err.response.data.failure_message);
        }
      );
      this.setState({ uploadFileIsOpen: false });
    } else {
      alert("No file selected");
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
        res => {
          console.log(res);
          if (res.modifications.length !== 0) {
            console.log(res.modifications);
            if (uploadType === "models") {
              this.setState({
                modelAlterationsIsOpen: true,
                uploading: false,
                modifiedModels: res.modifications,
                ignoredModels: res.ignored,
                addedModels: res.added
              });
            } else if (uploadType === "assets") {
              this.setState({
                assetAlterationsIsOpen: true,
                uploading: false,
                modifiedAssets: res.modifications,
                ignoredAssets: res.ignored,
                addedAssets: res.added
              });
            } else {
              this.setState({
                networkAlterationsIsOpen: true,
                uploading: false,
                modifiedNetwork: res.modifications,
                ignoredNetwork: res.ignored,
                addedNetwork: res.added
              });
            }
          } else {
            alert(
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
        err => {
          this.setState({ uploading: false });
          alert(err.response.data.failure_message);
        }
      );
    } else {
      alert("No data to upload");
    }
    console.log("here, regardless of error or success");
    this.setState({
      loadedModels: undefined,
      loadedAssets: undefined,
      modifiedModels: undefined,
      modifiedAssets: undefined
    });
  };

  /*
   * Set file from fileSelect component
   * to state in this component
   */
  private setFile = (file: File) => {
    this.setState({
      selectedFile: file
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
      Authorization: "Token " + token
    }
  };
  const postBody = { import_csv: encodedFile };
  return await axios.post(url, postBody, headers).then(res => {
    console.log(res.data);
    const data = res.data;
    return data;
  });
}

// /*
//  * Reads file to string
//  */
// async function parse(file: File) {
//   return new Promise((resolve, reject) => {
//     let content = '';
//     const reader = new FileReader();
//     reader.onloadend = function (e: any) {
//       content = e.target.result;
//       const result = content//.split(/\r\n|\n/);
//       resolve(result);
//     };
//     reader.onerror = function (e: any) {
//       reject(e);
//     };
//     reader.readAsText(file)
//   });
// }

async function getBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let content = "";
    reader.onload = function(e: any) {
      content = e.target.result;
      const result = content;
      resolve(result);
    };
    reader.onerror = function(e: any) {
      reject(e);
    };
    reader.readAsDataURL(file);
  });
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(BulkImport));

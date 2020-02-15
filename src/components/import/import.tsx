import { Classes, AnchorButton, Alert, Dialog, Tag, Overlay, Spinner } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../utils/api-config";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
import { AssetObject, ModelObjectOld } from "../../utils/utils";
import "./import.scss";
import { FileSelector } from "../lib/fileSelect"
import { Modifier } from "./viewModified"
import Instructions from "./importInstructions"

var console: any = {};
console.log = function () { };
interface ImportProps {
  token: string
}

interface AlertState {
  uploadModelIsOpen: boolean,
  uploadAssetIsOpen: boolean,
  modelAlterationsIsOpen: boolean,
  assetAlterationsIsOpen: boolean,
  selectedFile?: File,
  loadedModels?: Array<ModelObjectOld>,
  loadedAssets?: Array<AssetObject>,
  modifiedModels?: Array<any>,
  modifiedAssets?: Array<any>,
  ignoredModels?: number,
  ignoredAssets?: number,
  addedModels?: number,
  addedAssets?: number,
  uploading: boolean,
  uploadType: string,
  notify: boolean
}

interface AssetInfoObject {
  hostname: string,
  elevation: string,
  vendor: string,
  model_number: string,
  rack: string,
  owner: string,
  comment: string
}

const c2j = require('csvtojson')

export class BulkImport extends React.PureComponent<RouteComponentProps & ImportProps, AlertState> {

  public state: AlertState = {
    uploadModelIsOpen: false,
    uploadAssetIsOpen: false,
    modelAlterationsIsOpen: false,
    assetAlterationsIsOpen: false,
    uploading: false,
    uploadType: "",
    notify: false
  };

  render() {
    return (
      <div className={Classes.DARK + " import"}>
        <Overlay isOpen={this.state.uploading} className={"uploading-overlay"}>
          <Spinner size={Spinner.SIZE_LARGE} />
        </Overlay>
        <div className={"row"}>
          <div className={"column-third-left-import"}>
            <p> </p>
            <AnchorButton
              large={true}
              intent="primary"
              icon="import"
              text="Select Assets File"
              onClick={this.handleAssetOpen}
            />
            <Alert
              cancelButtonText="Cancel"
              confirmButtonText="Choose File"
              intent="primary"
              isOpen={this.state.uploadAssetIsOpen}
              onCancel={this.handleAssetCancel}
              onConfirm={this.handleAssetUpload}
            >
              <p>Choose a file</p>
              <FileSelector {...this.props} callback={this.setFile} />
            </Alert>
          </div>
          <div className={"column-third-import"}>
            <h1>OR</h1>
          </div>
          <div className={"column-third-right-import"}>
            <p> </p>
            <AnchorButton
              large={true}
              intent="primary"
              icon="import"
              text="Select Models File"
              onClick={this.handleModelOpen}
            />
            <Alert
              cancelButtonText="Cancel"
              confirmButtonText="Choose File"
              intent="primary"
              isOpen={this.state.uploadModelIsOpen}
              onCancel={this.handleModelCancel}
              onConfirm={this.handleModelUpload}
            >
              <p>Choose a file</p>
              <FileSelector {...this.props} callback={this.setFile} />
            </Alert>
          </div>
        </div>
        <div className={"row"}>
          <div className={"column-third-left-import"}>
          </div>
          <div className={"column-third-import"}>
            <AnchorButton
              large={true}
              intent="success"
              icon="upload"
              text={"Upload " + this.state.uploadType}
              disabled={this.state.selectedFile === undefined}
              onClick={this.handleUpload}
            />
          </div>
          <div className={"column-third-right-import"}>
          </div>
        </div>
        <div className={"row"}>
          <div className={"column-third-left-import"}>
          </div>
          <div className={"column-third-import"}>
            <Tag>
              <p>Selected file: {this.state.selectedFile === undefined ? "none" : this.state.selectedFile.name}</p>
            </Tag>
          </div>
          <div className={"column-third-right-import"}>
          </div>
        </div>
        <div>
          <Dialog isOpen={this.state.modelAlterationsIsOpen} onClose={() => this.setState({ modelAlterationsIsOpen: false, loadedModels: undefined, modifiedModels: undefined })} className={"modify-table"}
            usePortal={true} isCloseButtonShown={true} title={"Model Alterations Menu"}>
            <Modifier {...this.props} modelsModified={this.state.modifiedModels} modelsAdded={this.state.addedModels} modelsIgnored={this.state.ignoredModels}
              callback={() => { this.setState({ modelAlterationsIsOpen: false, modifiedModels: undefined, loadedModels: undefined }); console.log(this.state) }}
              operation={"models"}
            />
          </Dialog>
          <Alert isOpen={this.state.notify} confirmButtonText="OK" onClose={() => this.setState({ notify: false })}><p>Hello</p></Alert>
        </div>
        <div>
          <Dialog isOpen={this.state.assetAlterationsIsOpen} onClose={() => this.setState({ assetAlterationsIsOpen: false, loadedAssets: undefined, modifiedAssets: undefined })} className={"modify-table"}
            usePortal={true} isCloseButtonShown={true} title={"Asset Alterations Menu"}>
            <Modifier {...this.props} modelsModified={this.state.modifiedAssets} modelsAdded={this.state.addedAssets} modelsIgnored={this.state.ignoredAssets}
              callback={() => { this.setState({ assetAlterationsIsOpen: false, modifiedAssets: undefined, loadedAssets: undefined }) }}
              operation={"assets"}
            />
          </Dialog>
        </div>
        <Instructions />
      </div>
    )
  }

  /*********** Functions ***********************/

  private handleAssetOpen = () => this.setState({ uploadAssetIsOpen: true, uploadType: "Asset" });
  private handleAssetCancel = () => this.setState({ uploadAssetIsOpen: false });
  private handleAssetUpload = () => {
    this.setState({ loadedModels: undefined })
    if (this.state.selectedFile !== undefined) {
      parse(this.state.selectedFile).then((res: any) => {
        const fields = ["hostname", "rack", "rack_position", "vendor", "model_number", "owner", "comment"]
        var keys = res.split(/\r\n/)[0].split(",");
        if (keys.length > fields.length) {
          alert("ERROR: Too many columns in file")
          return
        } else if (keys.length < fields.length) {
          alert("ERROR: Not enough columns in file")
          return
        } else {
          for (var i = 0; i < keys.length; i++) {
            if (!fields.includes(keys[i])) {
              alert("ERROR: File contains badly formatted header: key: " + keys[i])
              return
            }
          }
        }

        c2j({
          noheader: false,
          output: "json"
        }).fromString(res).then((csvRow: Array<any>) => {
          for (var i = 0; i < csvRow.length; i++) {
            /* This next block is just to fix field names from the csv format to our backend format */
            const asset: AssetInfoObject = {
              hostname: csvRow[i].hostname,
              elevation: csvRow[i].rack_position,
              vendor: csvRow[i].vendor,
              model_number: csvRow[i].model_number,
              rack: csvRow[i].rack,
              owner: csvRow[i].owner,
              comment: csvRow[i].comment
            };
            csvRow[i] = asset;
          }
          /* set state variable to JSON array with proper field names */
          this.setState({
            loadedAssets: csvRow
          });
          /* Now make API request with JSON as header */
          console.log(this.state.loadedAssets);
        })
      }, err => {
        alert(err.response.data.failure_message)
      })
      // alert("Models have been loaded to browser, proceed to upload");
      this.setState({ uploadAssetIsOpen: false });
    } else {
      alert("No file selected")
    }
  };

  private handleModelOpen = () => this.setState({ uploadModelIsOpen: true, uploadType: "Model" });
  private handleModelCancel = () => this.setState({ uploadModelIsOpen: false });

  /*
   * serializes data to JSON and
   * makes backend requests
   */
  private handleModelUpload = () => {
    /* Serialize to JSON */
    this.setState({ loadedAssets: undefined });
    if (this.state.selectedFile !== undefined) {
      parse(this.state.selectedFile).then((res: any) => {
        const fields = ["vendor", "model_number", "height", "display_color", "ethernet_ports", "power_ports", "cpu", "memory", "storage", "comment"]
        var keys = res.split(/\r\n/)[0].split(",");
        if (keys.length > fields.length) {
          alert("ERROR: Too many columns in file")
          return
        } else if (keys.length < fields.length) {
          alert("ERROR: Not enough columns in file")
          return
        } else {
          for (var i = 0; i < keys.length; i++) {
            if (!fields.includes(keys[i])) {
              alert("ERROR: File contains badly formatted header: key: " + keys[i])
              return
            }
          }
        }
        c2j({
          noheader: false,
          output: "json"
        }).fromString(res).then((csvRow: Array<any>) => {
          for (var i = 0; i < csvRow.length; i++) {
            /* This next block is just to fix field names from the csv format to our backend format */
            const model: ModelObjectOld = {
              vendor: csvRow[i].vendor,
              model_number: csvRow[i].model_number,
              height: csvRow[i].height,
              display_color: csvRow[i].display_color,
              num_ethernet_ports: csvRow[i].ethernet_ports,
              num_power_ports: csvRow[i].power_ports,
              cpu: csvRow[i].cpu,
              memory_gb: csvRow[i].memory,
              storage: csvRow[i].storage,
              comment: csvRow[i].comment,
              id: csvRow[i].id
            };
            csvRow[i] = model;
          }
          /* set state variable to JSON array with proper field names */
          this.setState({
            loadedModels: csvRow
          })
          /* Now make API request with JSON as header */
          console.log(this.state.loadedModels)
        })
      }, err => {
        alert(err.response.data.failure_message)
      })
      // alert("Models have been loaded to browser, proceed to upload");
      this.setState({ uploadModelIsOpen: false });
    } else {
      alert("No file selected")
    }
  };

  private handleUpload = () => {
    if (this.state.loadedModels !== undefined) {
      this.setState({ uploading: true })
      uploadBulk({ models: this.state.loadedModels }, this.props.token, "models").then(res => {
        if (res.modifications.length !== 0) {
          this.setState({
            modelAlterationsIsOpen: true,
            uploading: false,
            modifiedModels: res.modifications,
            ignoredModels: res.ignored,
            addedModels: res.added
          })
        } else {
          alert("Success! Modified: 0; Added: " + res.added + "; Ignored: " + res.ignored);
          this.setState({ uploading: false, loadedModels: undefined })
        }
      }, err => {
        this.setState({ uploading: false })
        alert(err.response.data.failure_message)
      })
    } else if (this.state.loadedAssets !== undefined) {
      this.setState({ uploading: true })
      uploadBulk({ assets: this.state.loadedAssets }, this.props.token, "assets").then(res => {
        if (res.modifications.length !== 0) {
          this.setState({
            assetAlterationsIsOpen: true,
            uploading: false,
            modifiedAssets: res.modifications,
            ignoredAssets: res.ignored,
            addedAssets: res.added
          })
        } else {
          alert("Success! Modified: 0; Added: " + res.added + "; Ignored: " + res.ignored);
          this.setState({ uploading: false, loadedModels: undefined })
        }
      }, err => {
        this.setState({ uploading: false })
        alert(err.response.data.failure_message)
      })
    } else {
      alert("No data to upload")
    }
    console.log("here, regardless of error or success")
    this.setState({ loadedModels: undefined, loadedAssets: undefined, modifiedModels: undefined, modifiedAssets: undefined })
  }

  /*
   * Set file from fileSelect component
   * to state in this component
   */
  private setFile = (file: File) => {
    this.setState({
      selectedFile: file
    })
  }

}


async function uploadBulk(modelList: any, token: string, type: string) {
  console.log(modelList)
  console.log(API_ROOT + "api/" + type + "/bulk-upload");
  console.log(token)
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  };
  return await axios
    .post(API_ROOT + "api/" + type + "/bulk-upload", modelList, headers)
    .then(res => {
      console.log(res.data)
      const data = res.data;
      return data;
    });
}

/*
 * Reads file to string
 */
async function parse(file: File) {
  return new Promise((resolve, reject) => {
    let content = '';
    const reader = new FileReader();
    reader.onloadend = function (e: any) {
      content = e.target.result;
      const result = content//.split(/\r\n|\n/);
      resolve(result);
    };
    reader.onerror = function (e: any) {
      reject(e);
    };
    reader.readAsText(file)
  });
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(BulkImport));

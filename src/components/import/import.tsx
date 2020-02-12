import { Classes, AnchorButton, Alert, Dialog, Card, Elevation, Tag, Overlay, Spinner } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../utils/api-config";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
import { InstanceObject, ModelObjectOld } from "../../utils/utils";
import "./import.scss";
import { FileSelector } from "../lib/fileSelect"
import { Modifier } from "./viewModified"

var console:any = {};
console.log = function(){};
interface ImportProps {
  token: string
}

interface AlertState {
  uploadModelIsOpen: boolean,
  uploadInstanceIsOpen: boolean,
  modelAlterationsIsOpen: boolean,
  instanceAlterationsIsOpen: boolean,
  selectedFile?: File,
  loadedModels?: Array<ModelObjectOld>,
  loadedInstances?: Array<InstanceObject>,
  modifiedModels?: Array<any>,
  modifiedInstances?: Array<any>,
  ignoredModels?: number,
  ignoredInstances?: number,
  addedModels?: number,
  addedInstances?: number,
  uploading: boolean,
  uploadType: string,
  notify: boolean
}

interface InstanceInfoObject {
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
    uploadInstanceIsOpen: false,
    modelAlterationsIsOpen: false,
    instanceAlterationsIsOpen: false,
    uploading: false,
    uploadType: "",
    notify: false
  };

  render() {
    return (
      <div className={Classes.DARK + " import"}>
        <Overlay isOpen={this.state.uploading} className={"uploading-overlay"}>
          <Spinner size={Spinner.SIZE_LARGE}/>
        </Overlay>
        <div className={"row"}>
          <div className={"column-third-left-import"}>
            <p> </p>
            <AnchorButton
              large={true}
              intent="primary"
              icon="import"
              text="Select Instances File"
              onClick={this.handleInstanceOpen}
            />
            <Alert
              cancelButtonText="Cancel"
              confirmButtonText="Choose File"
              intent="primary"
              isOpen={this.state.uploadInstanceIsOpen}
              onCancel={this.handleInstanceCancel}
              onConfirm={this.handleInstanceUpload}
            >
              <p>Choose a file</p>
              <FileSelector {...this.props} callback={this.setFile}/>
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
              <FileSelector {...this.props} callback={this.setFile}/>
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
          <Dialog isOpen={this.state.modelAlterationsIsOpen} onClose={() => this.setState({modelAlterationsIsOpen: false, loadedModels: undefined, modifiedModels: undefined})} className={"modify-table"}
                  usePortal={true} isCloseButtonShown={true} title={"Model Alterations Menu"}>
            <Modifier {...this.props} modelsModified={this.state.modifiedModels} modelsAdded={this.state.addedModels} modelsIgnored={this.state.ignoredModels}
              callback={() => {this.setState({modelAlterationsIsOpen: false, modifiedModels: undefined, loadedModels: undefined}); console.log(this.state)}}
              operation={"models"}
            />
          </Dialog>
          <Alert isOpen={this.state.notify} confirmButtonText="OK" onClose={() => this.setState({notify: false})}><p>Hello</p></Alert>
        </div>
        <div>
          <Dialog isOpen={this.state.instanceAlterationsIsOpen} onClose={() => this.setState({instanceAlterationsIsOpen: false, loadedInstances: undefined, modifiedInstances: undefined})} className={"modify-table"}
                  usePortal={true} isCloseButtonShown={true} title={"Instance Alterations Menu"}>
            <Modifier {...this.props} modelsModified={this.state.modifiedInstances} modelsAdded={this.state.addedInstances} modelsIgnored={this.state.ignoredInstances}
              callback={() => {this.setState({instanceAlterationsIsOpen: false, modifiedInstances: undefined, loadedInstances: undefined})}}
              operation={"instances"}
            />
          </Dialog>
        </div>
        <div className={"bp3-heading"}>
          <Card elevation={Elevation.ONE}>
            <div>
              <h2>Upload instructions:</h2>
            </div>
            <h3>General format:</h3>
              <ol className={"bp3-list"}>
                <li>All files should be CSV format in compliance with RFC 4180. Important specifications are outlined as follows:
                  <ul className={"bp3-list"}>
                    <li>Each record is located on a separate line, delimited by a line break (Note: the last file may or may not have an ending line break)</li>
                    <li>Each record should contain the same number of comma-separated fields</li>
                    <li>Spaces are considered part of a field and should not be ignored</li>
                    <li>Each field may or may not be enclosed in double quotes</li>
                    <li>Fields containing a line break, double quote, or commas MUST be quoted</li>
                    <li>If double quote are used to enclose fields, then a double quote appearing inside a field must be escaped by preceding it with another double quote</li>
                  </ul>
                </li>
                <li>Deviations from this standard are as follows:
                  <ul className={"bp3-list"}>
                    <li>A header row is required. See below for column headers for various equipment files</li>
                    <li> On import both *nix (LF) and Windows-style (CRLF) line endings are accepted
                      <ul>
                        <li>On export, Windows-style endings (CRLF) will be emitted in conformance to the standard</li>
                        <li>Thes same rules apply to line breaks within multi-line string values (i.e. comments)</li>
                      </ul>
                    </li>
                    <li>UTF-8 charset is used for both import and export
                      <ul>
                        <li>Double quotes should use code U+0022 QUOTATION MARK</li>
                        <li>Commas should use code U+002C COMMA</li>
                      </ul>
                    </li>
                  </ul>
                </li>
              </ol>
            <h3>Model/Instance-specific fields:</h3>
              <Card elevation={Elevation.THREE}>
                <h4>Model upload:</h4>
                <ol className={"bp3-list"}>
                  <li>Fields:
                    <ul className={"bp3-list"}>
                      <li>vendor: required always; string</li>
                      <li>model_number: required always; string</li>
                      <li>height: required for new modes, otherwise optional; positive integer; height in U</li>
                      <li>display_color: optional; 6-digit, 3-byte hex triplet (RGB) preceded by pound sign (#); case insensitive; e.g. #7FFFD4</li>
                      <li>ethernet_ports: optional; non-negative integer</li>
                      <li>power_ports: optional, non-negative integer</li>
                      <li>cpu: optional; string</li>
                      <li>memory: optional; string</li>
                      <li>comment: optional; string; must be enclosed by double quotes if the value contains line breaks</li>
                    </ul>
                  </li>
                </ol>
              </Card>
              <Card elevation={Elevation.THREE}>
                <h4>Instance upload:</h4>
                <ol className={"bp3-list"}>
                  <li>Fields:
                    <ul className={"bp3-list"}>
                      <li>hostname: required always; RFC-1034-compliant string</li>
                      <li>rack: required for new instances, otherwise optional; string; address is by row letter (A-Z) then rack number (positive integer); There is no separator between row letter and rack number</li>
                      <li>rack_position: required for new instances, otherwise optional; positive integer; refers to vertical location in U of bottom of equipment</li>
                      <li>vendor: required for new instances, otherwise optional; string; refers to vendor of the model with which this instance is associated</li>
                      <li>model_number: required for new instances, otherwise optional; string; refers to model number of the model with which this instance is associated. Together with vendor uniquely identifies a model</li>
                      <li>owner: optional; string; refers to the username of an existing user in the system who owns this equipment</li>
                      <li>comment: optiona; string; must be enclosed by double quotes if the value contains line breaks</li>
                    </ul>
                  </li>
                </ol>
              </Card>
            <h4>Notes:</h4>
            <ol className={"bp3-list"}>
              <li>It is not possible to use the bulk import feature to modify a field marked "required always." Any attempt to do so will result in a new model/instance being created</li>
              <li>Any field not included in an import will be considered "matching" (i.e. if the record exists, the empty field will not be overwritten)</li>
            </ol>
          </Card>
        </div>
      </div>
    )
  }

  /*********** Functions ***********************/

  private handleInstanceOpen = () => this.setState({ uploadInstanceIsOpen: true, uploadType: "Instance" });
  private handleInstanceCancel = () => this.setState({ uploadInstanceIsOpen: false });
  private handleInstanceUpload = () => {
    this.setState({loadedModels: undefined})
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
            const instance: InstanceInfoObject = {
              hostname: csvRow[i].hostname,
              elevation: csvRow[i].rack_position,
              vendor: csvRow[i].vendor,
              model_number: csvRow[i].model_number,
              rack: csvRow[i].rack,
              owner: csvRow[i].owner,
              comment: csvRow[i].comment
            };
            csvRow[i] = instance;
          }
          /* set state variable to JSON array with proper field names */
          this.setState({
            loadedInstances: csvRow
          });
          /* Now make API request with JSON as header */
          console.log(this.state.loadedInstances);
        })
      }, err => {
        alert(err.response.data.failure_message)
      })
      // alert("Models have been loaded to browser, proceed to upload");
      this.setState({ uploadInstanceIsOpen: false });
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
    this.setState({loadedInstances: undefined});
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
      this.setState({uploading: true})
      uploadBulk({models: this.state.loadedModels}, this.props.token, "models").then(res => {
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
        this.setState({uploading: false})
        alert(err.response.data.failure_message)
      })
    } else if (this.state.loadedInstances !== undefined) {
      this.setState({uploading: true})
      uploadBulk({instances: this.state.loadedInstances}, this.props.token, "instances").then(res => {
        if (res.modifications.length !== 0) {
          this.setState({
            instanceAlterationsIsOpen: true,
            uploading: false,
            modifiedInstances: res.modifications,
            ignoredInstances: res.ignored,
            addedInstances: res.added
          })
        } else {
          alert("Success! Modified: 0; Added: " + res.added + "; Ignored: " + res.ignored);
          this.setState({ uploading: false, loadedModels: undefined })
        }
      }, err => {
        this.setState({uploading: false})
        alert(err.response.data.failure_message)
      })
    } else {
      alert("No data to upload")
    }
    console.log("here, regardless of error or success")
    this.setState({loadedModels: undefined, loadedInstances: undefined, modifiedModels: undefined, modifiedInstances: undefined})
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
    reader.onloadend = function(e: any) {
      content = e.target.result;
      const result = content//.split(/\r\n|\n/);
      resolve(result);
    };
    reader.onerror = function(e: any) {
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

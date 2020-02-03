import { Classes, AnchorButton, Alert, Dialog, Card, Elevation } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../api-config";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
import { InstanceObject, ModelObject } from "../utils";
import "./import.scss";
import { FileSelector } from "../lib/fileSelect"
import { Modifier } from "./viewModified"

interface ImportProps {
  token: string
}

interface AlertState {
  uploadModelIsOpen: boolean,
  uploadInstanceIsOpen: boolean,
  modelAlterationsIsOpen: boolean,
  instanceAlterationsIsOpen: boolean,
  selectedFile?: File,
  loadedModels?: Array<ModelObject>,
  loadedInstances?: Array<InstanceObject>,
  modifiedModels?: Array<any>,
  modifiedInstances?: Array<any>
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
    instanceAlterationsIsOpen: false
  };

  render() {
    return (
      <div className={Classes.DARK + " import"}>
        <div className={"bp3-heading"}>
          <Card elevation={Elevation.ONE}>
            <div>
              <h2>Upload instructions:</h2>
            </div>
            <h3>General format:</h3>
              <ol className={"bp3-list"}>
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
            </ol>
          </Card>
        </div>
        <div className={"row"}>
          <div className={"column-third-left"}>
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
          <div className={"column-third"}>
            <h1>OR</h1>
          </div>
          <div className={"column-third-right"}>
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
          <div className={"column"}>
            <AnchorButton
              large={true}
              intent="success"
              icon="upload"
              text="Upload Data"
              disabled={this.state.selectedFile === undefined}
              onClick={this.handleUpload}
            />
          </div>
          <div className={"column"}>
            <h2>Selected file: {this.state.selectedFile === undefined ? "none" : this.state.selectedFile.name}</h2>
          </div>
        </div>
        <div>
          <Dialog isOpen={this.state.modelAlterationsIsOpen} onClose={() => this.setState({modelAlterationsIsOpen: false})} className={"modify-table"}
                  usePortal={true}>
            <Modifier {...this.props} models={this.state.modifiedModels}
              callback={() => {this.setState({modelAlterationsIsOpen: false, modifiedModels: undefined, loadedModels: undefined}); console.log(this.state)}}
              operation={"models"}
            />
          </Dialog>
        </div>
        <div>
          <Dialog isOpen={this.state.instanceAlterationsIsOpen} onClose={() => this.setState({instanceAlterationsIsOpen: false})} className={"modify-table"}
                  usePortal={true}>
            <Modifier {...this.props} models={this.state.modifiedInstances}
              callback={() => {this.setState({instanceAlterationsIsOpen: false, modifiedInstances: undefined, loadedInstances: undefined})}}
              operation={"instances"}
            />
          </Dialog>
        </div>
      </div>
    )
  }

  /*********** Functions ***********************/

  private handleInstanceOpen = () => this.setState({ uploadInstanceIsOpen: true });
  private handleInstanceCancel = () => this.setState({ uploadInstanceIsOpen: false });
  private handleInstanceUpload = () => {
    if (this.state.selectedFile !== undefined) {
      parse(this.state.selectedFile).then((res) => {
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
          console.log(this.state.loadedInstances)
        })
      })
      // alert("Models have been loaded to browser, proceed to upload");
      this.setState({ uploadInstanceIsOpen: false });
    } else {
      alert("No file selected")
    }
  };

  private handleModelOpen = () => this.setState({ uploadModelIsOpen: true });
  private handleModelCancel = () => this.setState({ uploadModelIsOpen: false });

  /*
   * serializes data to JSON and
   * makes backend requests
   */
  private handleModelUpload = () => {
    /* Serialize to JSON */
    if (this.state.selectedFile !== undefined) {
      parse(this.state.selectedFile).then((res) => {
        c2j({
          noheader: false,
          output: "json"
        }).fromString(res).then((csvRow: Array<any>) => {
          for (var i = 0; i < csvRow.length; i++) {
            /* This next block is just to fix field names from the csv format to our backend format */
            const model: ModelObject = {
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
      })
      // alert("Models have been loaded to browser, proceed to upload");
      this.setState({ uploadModelIsOpen: false });
    } else {
      alert("No file selected")
    }
  };

  private handleUpload = () => {
    if (this.state.loadedModels !== undefined) {
      uploadBulk({models: this.state.loadedModels}, this.props.token, "models").then(res => {
        if (res.modifications.length !== 0) {
          this.setState({
            modelAlterationsIsOpen: true,
            modifiedModels: res.modifications
          })
        } else {
          alert("Upload successful with no modifications")
        }
      })
    } else if (this.state.loadedInstances !== undefined) {
      uploadBulk({instances: this.state.loadedInstances}, this.props.token, "instances").then(res => {
        if (res.modifications.length !== 0) {
          this.setState({
            instanceAlterationsIsOpen: true,
            modifiedInstances: res.modifications
          })
        } else {
          alert("Upload successful with no modifications");
        }
      })
    } else {
      alert("No data to upload")
    }
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

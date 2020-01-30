import { Classes, AnchorButton, Alert, Dialog } from "@blueprintjs/core";
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
  selectedFile?: File,
  loadedModels?: Array<ModelObject>,
  loadedInstances?: Array<InstanceObject>,
  modifiedModels?: Array<any>
}

const c2j = require('csvtojson')

export class BulkImport extends React.PureComponent<RouteComponentProps & ImportProps, AlertState> {

  public state: AlertState = {
    uploadModelIsOpen: false,
    uploadInstanceIsOpen: false,
    modelAlterationsIsOpen: false
  };

  render() {
    return (
      <div className={Classes.DARK + " import"}>
        <h1>Upload instructions here</h1>
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
          <div className={"column"}>
            <AnchorButton
              large={true}
              intent="success"
              icon="upload"
              text="Upload Data"
              onClick={this.handleUpload}
            />
          </div>
        </div>
        <div>
          <Dialog isOpen={this.state.modelAlterationsIsOpen} onClose={() => this.setState({modelAlterationsIsOpen: false})} className={"modify-table"}
                  usePortal={true}>
            <Modifier {...this.props} models={this.state.modifiedModels} callback={() => {this.setState({modelAlterationsIsOpen: false})}}/>
          </Dialog>
        </div>
      </div>
    )
  }

  /*********** Functions ***********************/

  private handleInstanceOpen = () => this.setState({ uploadInstanceIsOpen: true });
  private handleInstanceCancel = () => this.setState({ uploadInstanceIsOpen: false });
  private handleInstanceUpload = () => {
    alert("Instances were successfully uploaded");
    this.setState({ uploadInstanceIsOpen: false });
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
      uploadBulk(this.state.loadedModels, this.props.token).then(res => {
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


async function uploadBulk(modelList: Array<ModelObject>, token: string) {
  console.log(API_ROOT + "api/models/bulk-upload");
  console.log(token)
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  };
  return await axios
    .post(API_ROOT + "api/models/bulk-upload", {models: modelList}, headers)
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

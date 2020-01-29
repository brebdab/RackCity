import { Classes, AnchorButton, Alert } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../api-config";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
import { InstanceObject, ModelObject } from "../utils";
import "./import.scss";
import { FileSelector } from "../lib/fileSelect"
import csvtojson from "csvtojson";

interface AlertState {
  uploadModelIsOpen: boolean,
  uploadInstanceIsOpen: boolean,
  selectedFile?: File,
  loadedModels?: Array<ModelObject>,
  loadedInstances?: Array<InstanceObject>
}

const c2j = require('csvtojson')

export class BulkImport extends React.PureComponent<RouteComponentProps, AlertState> {

  public state: AlertState = {
    uploadModelIsOpen: false,
    uploadInstanceIsOpen: false
  };

  render() {
    return (
      <div className={Classes.DARK + " import"}>
        <h1>Upload instructions here</h1>
        <div className={"row"}>
          <div className={"column"}>
            <AnchorButton
              large={true}
              intent="primary"
              icon="export"
              text="Upload Instances"
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
          <div className={"column"}>
            <AnchorButton
              large={true}
              intent="primary"
              icon="export"
              text="Upload Models"
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
  private handleModelUpload = () => {
    if (this.state.selectedFile !== undefined) {
      parse(this.state.selectedFile).then((res) => {
        c2j({
          noheader: false,
          output: "json"
        }).fromString(res).then((csvRow: Array<any>) => {
          for (var i = 0; i < csvRow.length; i++) {
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
              comment: csvRow[i].comment
            };
            csvRow[i] = model;
          }
          this.setState({
            loadedModels: csvRow
          })

          console.log(this.state.loadedModels)
        })
        // console.log(data)
      })
      alert("Models were successfully uploaded: " + this.state.selectedFile);
      this.setState({ uploadModelIsOpen: false });
    } else {
      alert("No file selected")
    }
  };

  /* Set file from fileSelect component to state in this component */
  private setFile = (file: File) => {
    this.setState({
      selectedFile: file
    })
  }

}

/* Reads file to string */
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

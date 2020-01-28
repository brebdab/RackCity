import { Classes, AnchorButton, Alert } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../api-config";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
import { InstanceObject } from "../utils";
import "./import.scss";

interface AlertState {
  uploadModelIsOpen: boolean,
  uploadInstanceIsOpen: boolean
}

export class BulkImport extends React.PureComponent<RouteComponentProps, AlertState> {

  public state: AlertState = {
    uploadModelIsOpen: false,
    uploadInstanceIsOpen: false
  }

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
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  private handleInstanceOpen = () => this.setState({ uploadInstanceIsOpen: true });
  private handleInstanceCancel = () => this.setState({ uploadInstanceIsOpen: false });
  private handleInstanceUpload = () => {
    alert("Instances were successfully uploaded");
    this.setState({ uploadInstanceIsOpen: false });
  };

  private handleModelOpen = () => this.setState({ uploadModelIsOpen: true });
  private handleModelCancel = () => this.setState({ uploadModelIsOpen: false });
  private handleModelUpload = () => {
    alert("Models were successfully uploaded");
    this.setState({ uploadModelIsOpen: false });
  };

}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(BulkImport));

import { Classes, AnchorButton, Alert } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../../api-config";
import PropertiesView from "../propertiesView";
import { RouteComponentProps, withRouter } from "react-router";
import "./instanceView.scss";
import { connect } from "react-redux";
import { InstanceObject, ElementType, getHeaders } from "../../utils";
import FormPopup from "../../../forms/FormPopup";
import { FormTypes } from "../../../forms/modelForm";

export interface InstanceViewProps {
  token: string;
  rid: any;
  isAdmin: boolean;
}
// Given an rid, will perform a GET request of that rid and display info about that instnace

async function getData(instancekey: string, token: string) {
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  };
  return await axios
    .get(API_ROOT + "api/instances/" + instancekey, headers)
    .then(res => {
      const data = res.data;
      return data;
    });
}

interface InstanceViewState {
  instance: InstanceObject | undefined;
  columns: Array<string>;
  fields: Array<string>;
  isFormOpen: boolean;
  isDeleteOpen: boolean;
}

export class InstanceView extends React.PureComponent<
  RouteComponentProps & InstanceViewProps,
  InstanceViewState
> {
  public state: InstanceViewState = {
    instance: undefined,
    isFormOpen: false,
    isDeleteOpen: false,
    columns: ["Hostname", "Model", "Rack", "Elevation", "Owner", "Comment"],
    fields: ["hostname", "model", "rack", "elevation", "owner", "comment"]
  };
  private updateInstance = (
    instance: InstanceObject,
    headers: any
  ): Promise<any> => {
    return axios
      .post(API_ROOT + "api/instances/modify", instance, headers)
      .then(res => {
        console.log("success");
        this.handleFormClose();
        console.log(this.state.isFormOpen);
      });
  };
  public render() {
    let params: any;
    params = this.props.match.params;
    if (this.state.instance === undefined) {
      getData(params.rid, this.props.token).then(result => {
        this.setState({
          instance: result
        });
      });
      console.log(this.state.instance);
    }
    return (
      <div className={Classes.DARK + " instance-view"}>
        {this.props.isAdmin ? (
          <div className={"detail-buttons"}>
            <AnchorButton
              className="button-add"
              intent="primary"
              icon="edit"
              text="Edit"
              minimal
              onClick={() => this.handleFormOpen()}
            />
            <FormPopup
              isOpen={this.state.isFormOpen}
              initialValues={this.state.instance}
              type={FormTypes.MODIFY}
              elementName={ElementType.INSTANCE}
              handleClose={this.handleFormClose}
              submitForm={this.updateInstance}
            />
            <AnchorButton
              minimal
              className="button-add"
              intent="danger"
              icon="trash"
              text="Delete"
              onClick={this.handleDeleteOpen}
            />
            <Alert
              cancelButtonText="Cancel"
              confirmButtonText="Delete"
              intent="danger"
              isOpen={this.state.isDeleteOpen}
              onCancel={this.handleDeleteCancel}
              onConfirm={this.handleDelete}
            >
              <p>Are you sure you want to delete?</p>
            </Alert>
          </div>
        ) : null}
        <PropertiesView data={this.state.instance} {...this.state} />
      </div>
    );
  }
  private handleDeleteOpen = () => this.setState({ isDeleteOpen: true });
  private handleFormOpen = () => {
    this.setState({
      isFormOpen: true
    });
  };
  handleFormSubmit = () => {
    this.setState({
      isFormOpen: false
    });
  };
  private handleDeleteCancel = () => this.setState({ isDeleteOpen: false });
  private handleFormClose = () => this.setState({ isFormOpen: false });
  private handleDelete = () => {
    console.log(this.props.rid);
    const data = { id: this.state.instance!.id };
    axios
      .post(
        API_ROOT + "api/instances/delete",
        data,
        getHeaders(this.props.token)
      )
      .then(res => {
        alert("Model was successfully deleted"); // TODO change to real deletion
        this.setState({ isDeleteOpen: false });
      });
  };
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};

export default withRouter(connect(mapStatetoProps)(InstanceView));

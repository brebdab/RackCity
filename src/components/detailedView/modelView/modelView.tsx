import { Alert, AnchorButton, Classes, Tab, Tabs } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../../api-config";
import FormPopup from "../../../forms/FormPopup";
import { FormTypes } from "../../../forms/modelForm";
import { ElementType, ModelObject } from "../../utils";
import PropertiesView from "../propertiesView";

export interface ModelViewProps {
  token: string;
  rid: any;
  isAdmin: boolean;
}

interface ModelViewState {
  instances: Array<any> | undefined;
  model: ModelObject | undefined;
  columns: Array<string>;
  fields: Array<string>;
  isFormOpen: boolean;
  isDeleteOpen: boolean;
}

async function getData(modelkey: string, token: string) {
  console.log(API_ROOT + "api/models/" + modelkey);
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  };
  return await axios
    .get(API_ROOT + "api/models/" + modelkey, headers)
    .then(res => {
      const data = res.data;
      return data;
    });
}

export class modelView extends React.PureComponent<
  RouteComponentProps & ModelViewProps,
  ModelViewState
> {
  public state: ModelViewState = {
    instances: undefined,
    model: undefined,
    isFormOpen: false,
    isDeleteOpen: false,
    columns: [
      "Model #",
      "CPU",
      "Height",
      "Display Color",
      "Memory (GB)",
      "# Ethernet Ports",
      "# Power Ports",
      "Storage",
      "Vendor"
    ],
    fields: [
      "model_number",
      "cpu",
      "height",
      "display_color",
      "memory_gb",
      "num_ethernet_ports",
      "num_power_ports",
      "storage",
      "vendor"
    ]
  };

  private updateModel = (model: ModelObject, headers: any): Promise<any> => {
    return axios
      .post(API_ROOT + "api/models/modify", model, headers)
      .then(res => {
        console.log("success");
        this.handleFormClose();
        console.log(this.state.isFormOpen);
      });
  };
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
    alert("Model was successfully deleted"); // TODO change to real deletion
    this.setState({ isDeleteOpen: false });
  };
  public render() {
    let params: any;
    params = this.props.match.params;
    if (this.state.model === undefined) {
      getData(params.rid, this.props.token).then(result => {
        this.setState({
          model: result.model,
          instances: result.instances
        });
      });
    }
    var data = this.state.model;
    return (
      <div className={Classes.DARK + " model-view"}>
        {this.props.isAdmin ? (
          <div className={"row"}>
            <div className={"column"}>
              <AnchorButton
                large={true}
                intent="primary"
                icon="edit"
                text="Edit"
                onClick={() => this.handleFormOpen()}
              />
              <FormPopup
                isOpen={this.state.isFormOpen}
                initialValues={this.state.model}
                type={FormTypes.MODIFY}
                elementName={ElementType.MODEL}
                handleClose={this.handleFormClose}
                submitForm={this.updateModel}
              />
            </div>
            <div className={"column"}>
              <AnchorButton
                large={true}
                intent="danger"
                icon="trash"
                text="Delete Model"
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
          </div>
        ) : null}
        <Tabs
          id="ModelViewer"
          animate={true}
          large
          renderActiveTabPanelOnly={false}
        >
          <Tab
            id="ModelProperties"
            title="Properties"
            panel={<PropertiesView data={data} {...this.state} />}
          />
          <Tab
            id="Instances"
            title="Instances"
            panel={
              <ModelInstance
                history={this.props.history}
                location={this.props.location}
                match={this.props.match}
                {...this.state}
              />
            }
          />
          <Tabs.Expander />
        </Tabs>
      </div>
    );
  }
}

class ModelInstance extends React.PureComponent<RouteComponentProps> {
  renderData(data: any) {
    var i = -1;
    return (
      <div>
        {data.columns.map((item: string) => {
          i++;
          var key = data.fields[i];
          return (
            <h1 key={item}>
              {item}: {data[key]}
            </h1>
          );
        })}
      </div>
    );
  }

  render() {
    let state: any;
    state = this.props;
    console.log(state);
    return (
      <div className={Classes.DARK + " propsview"}>
        <p>i n s t a n c e</p>
      </div>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};

export default withRouter(connect(mapStatetoProps)(modelView));

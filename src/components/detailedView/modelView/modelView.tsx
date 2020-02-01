import { Alert, AnchorButton, Classes, Tab, Tabs } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../../api-config";
import FormPopup from "../../../forms/FormPopup";
import modelForm, { FormTypes } from "../../../forms/modelForm";
import ElementTable from "../../elementView/elementTable";
import { ElementType, InstanceObject, ModelObject } from "../../utils";
import PropertiesView from "../propertiesView";
import { getElementData } from "../../elementView/elementView";
import {
  IFilter,
  FilterTypes,
  TextFilterTypes
} from "../../elementView/filterSelectView";
import { filter } from "minimatch";
import { updateObject } from "../../../store/utility";

export interface ModelViewProps {
  token: string;
  rid: any;
  isAdmin: boolean;
}

interface ModelViewState {
  instances: Array<InstanceObject> | undefined;
  model: ModelObject | undefined;
  columns: Array<string>;
  fields: Array<string>;
  isFormOpen: boolean;
  isDeleteOpen: boolean;
}

const getData = (modelkey: string, token: string) => {
  console.log(API_ROOT + "api/models/" + modelkey);
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  };
  return axios.get(API_ROOT + "api/models/" + modelkey, headers).then(res => {
    const data = res.data;
    return data;
  });
};

export class ModelView extends React.Component<
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
      "Vendor",
      "Comment"
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
      "vendor",
      "comment"
    ]
  };
  componentDidMount() {
    let params: any;
    params = this.props.match.params;
    console.log("model view token", this.props.token);
    getData(params.rid, this.props.token).then(result => {
      console.log(result);
      this.setState({
        model: result.model,
        instances: result.instances
      });
    });
    console.log("MODEL LOADED", this.state.model);
  }
  getModelInstances = (
    path: string,
    page: number,
    page_size: number,
    body: any,
    token: string
  ) => {
    const filters: Array<IFilter> = [];
    console.log("GETTING INSTANCES", this.state.model, token);

    if (this.state.model) {
      console.log("GETTING INSTANCES WITH MODEL");
      filters.push({
        field: "model__vendor",
        filter_type: FilterTypes.TEXT,
        filter: {
          value: this.state.model!.vendor,
          match_type: TextFilterTypes.EXACT
        }
      });
      filters.push({
        field: "model__number",
        filter_type: FilterTypes.TEXT,
        filter: {
          value: this.state.model!.model_number,
          match_type: TextFilterTypes.EXACT
        }
      });
      return getElementData(
        path,
        page,
        page_size,
        updateObject(body, filters),
        token
      );
    }
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
    console.log(this.state.instances);
    let params: any;
    params = this.props.match.params;
    if (this.state.model === undefined) {
      getData(params.rid, this.props.token).then(result => {
        console.log(result);
        this.setState({
          model: result.model,
          instances: result.instances
        });
      });
    }

    var data = this.state.model;
    console.log("MODEL", data);
    return (
      <div className={Classes.DARK + " model-view"}>
        {this.props.isAdmin ? (
          <div className={"detail-buttons"}>
            <AnchorButton
              className="button-add"
              intent="primary"
              icon="edit"
              text="Edit"
              onClick={() => this.handleFormOpen()}
            />
            <FormPopup
              isOpen={this.state.isFormOpen}
              initialValues={this.state.model}
              type={FormTypes.MODIFY}
              elementName={ElementType.INSTANCE}
              handleClose={this.handleFormClose}
              submitForm={this.updateModel}
            />
            <AnchorButton
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
              <ElementTable
                type={ElementType.INSTANCE}
                getData={this.getModelInstances}
                disableFiltering={true}
              />
            }
          />
          <Tabs.Expander />
        </Tabs>
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

export default withRouter(connect(mapStatetoProps)(ModelView));

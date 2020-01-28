import { Classes, Tab, Tabs, AnchorButton, Dialog } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../../api-config";
import PropertiesView from "../propertiesView";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
import { ModelObject } from "../../utils";
import ModelForm, { FormTypes } from "../../../forms/modelForm";

export interface ModelViewProps {
  token: string;
  rid: any;
}

interface ModelViewState {
  instances: Array<any> | undefined;
  model: ModelObject | undefined;
  columns: Array<string>;
  fields: Array<string>;
  isOpen: boolean;
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
    isOpen: false,
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
  private handleOpen = () => {
    this.setState({
      isOpen: true
    });
  };
  private handleClose = () => this.setState({ isOpen: false });
  updateModel = (model: ModelObject, headers: any): Promise<any> => {
    return axios
      .post(API_ROOT + "api/models/modify", model, headers)
      .then(res => {
        console.log("success");
        this.handleClose();
        console.log(this.state.isOpen);
      });
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
        <AnchorButton
          large={true}
          intent="primary"
          icon="edit"
          text="Edit"
          onClick={() => this.handleOpen()}
        />
        <Dialog
          className={Classes.DARK}
          usePortal={true}
          enforceFocus={true}
          canEscapeKeyClose={true}
          canOutsideClickClose={true}
          isOpen={this.state.isOpen}
          onClose={this.handleClose}
          title={"Modify Model"}
        >
          <ModelForm
            initialValues={this.state.model}
            type={FormTypes.CREATE}
            submitForm={this.updateModel}
          />
        </Dialog>
        <Tabs id="ModelViewer" animate={true} renderActiveTabPanelOnly={false}>
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
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(modelView));

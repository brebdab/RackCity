import { Classes, Tab, Tabs } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../../api-config";
import PropertiesView from "../propertiesView";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";

export interface ModelViewProps { token: string, rid: any };

interface ModelViewState {
  comment: any,
  cpu: any,
  display_color: any,
  height: any,
  memory_gb: any,
  model_id: any,
  model_number: any,
  num_ethernet_ports: any,
  num_power_ports: any,
  storage: any,
  vendor: any,
  columns: Array<string>,
  fields: Array<string>,
  instances: Array<any>
}

class StateWrapper {

  state: ModelViewState;

  constructor(data: ModelViewState) {
    this.state = data;
  }
}

async function getData(modelkey: string, token: string) {
  console.log( API_ROOT + "api/models/" + modelkey)
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  }
  return await axios
    .get(API_ROOT + "api/models/" + modelkey, headers)
    .then(res => {
      const data = res.data;
      return data;
    });
}

export class modelView extends React.PureComponent<RouteComponentProps & ModelViewProps, ModelViewState> {

  public state: ModelViewState = {
    comment: "",
    cpu: "",
    display_color: "",
    height: "",
    memory_gb: "",
    model_id: "",
    model_number: "",
    num_ethernet_ports: "",
    num_power_ports: "",
    storage: "",
    vendor: "",
    columns: ["Model #", "CPU", "Height", "Display Color", "Memory (GB)", "# Ethernet Ports",
                "# Power Ports", "Storage", "Vendor"],
    fields: ["model_number", "cpu", "height", "display_color", "memory_gb", "num_ethernet_ports",
                "num_power_ports", "storage", "vendor"],
    instances: []
  }

  public render() {
    let params: any;
    params = this.props.match.params
    var param = new StateWrapper(this.state)
    console.log(this.state.instances.length)
    if (this.state.vendor.length == 0) {
      getData(params.rid, this.props.token).then((result) => {
      this.setState({
        comment: result.model.comment,
        cpu: result.model.cpu,
        display_color: result.model.display_color,
        height: result.model.height,
        memory_gb: result.model.memory_gb,
        model_id: result.model.id,
        model_number: result.model.model_number,
        num_ethernet_ports: result.model.num_ethernet_ports,
        num_power_ports: result.model.num_power_ports,
        storage: result.model.storage,
        vendor: result.model.vendor,
        instances: result.instances
      })
        })}
    return (
      <div className={Classes.DARK + " model-view"}>
        <Tabs
          id="ModelViewer"
          animate={true}
          renderActiveTabPanelOnly={false}
        >
          <Tab id="ModelProperties" title="Properties" panel={<PropertiesView
            history={this.props.history} location={this.props.location}
            match={this.props.match} {...param}/>}
            />
          <Tab id="Instances" title="Instances"
            panel={<ModelInstance history={this.props.history} location={this.props.location}
            match={this.props.match} {...param}/>}
            />
          <Tabs.Expander />
        </Tabs>
      </div>
    )
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
          return <h1 key={item}>{item}: {data[key]}</h1>
        })}
      </div>
    )
  }

  render() {
    let state: any;
    state = this.props;
    console.log(state)
    return (
      <div className={Classes.DARK + " propsview"}>
        <p>i n s t a n c e</p>
      </div>
    )
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(modelView));

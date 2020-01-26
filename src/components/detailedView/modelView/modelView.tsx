import { Classes, Tab, Tabs } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../../api-config";
import PropertiesView from "../propertiesView";
import { RouteComponentProps, withRouter } from "react-router";

export interface ModelViewProps { rid: string };

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
  columns: Array<string>
}

class StateWrapper {

  state: ModelViewState

  constructor(data: ModelViewState) {
    this.state = data;
  }
}

async function getData(modelkey: string) {
  console.log( API_ROOT + "api/models/" + modelkey)
  return await axios
    .get(API_ROOT + "api/models/" + modelkey)
    .then(res => {
      const data = res.data;
      return data;
    });
}

export class modelView extends React.PureComponent<RouteComponentProps, ModelViewState> {

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
    columns: ["Model ID", "Model #", "CPU", "Height", "Display Color", "Memory (GB)", "# Ethernet Ports",
                "# Power Ports", "Storage", "Vendor"]
  }

  async componentDidMount() {
    const resp = await getData("1");
    this.setState({
      comment: resp.comment,
      cpu: resp.cpu,
      display_color: resp.display_color,
      height: resp.height,
      memory_gb: resp.memory_gb,
      model_id: resp.model_id,
      model_number: resp.model_number,
      num_ethernet_ports: resp.num_ethernet_ports,
      num_power_ports: resp.num_power_ports,
      storage: resp.storage,
      vendor: resp.vendor
    })
  }

  public render() {
    // let params: any;
    // params = this.props.match.params
    var param = new StateWrapper(this.state)
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
            panel={<h1>googdbye</h1>} panelClassName="ember-panel"
            />
          <Tabs.Expander />
        </Tabs>
      </div>
    )
  }

}

export default withRouter(modelView);

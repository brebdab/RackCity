import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { Classes, Tab, Tabs } from "@blueprintjs/core";
import ElementTab from "./elementTab";
import { RouteComponentProps } from "react-router";
import "./elementView.scss";
import { connect } from "react-redux";
import {ElementType, DatacenterObject, getHeaders, ROUTES} from "../../utils/utils";
import RackTab from "./rackTab";
import { API_ROOT } from "../../utils/api-config";
import axios from "axios";
import { PermissionState } from "../../utils/permissionUtils";

interface ElementTabContainerProps {
  isAdmin: boolean;
  permissionState: PermissionState;
  token: string;
}
interface ElementTabContainerState {
  datacenters: Array<DatacenterObject>;
  currDatacenter: DatacenterObject;
}
export const ALL_DATACENTERS: DatacenterObject = {
  id: "",
  name: "All datacenters",
  abbreviation: "ALL",
};
// var console: any = {};
// console.log = function() {};

class ElementTabContainer extends React.Component<
  ElementTabContainerProps & RouteComponentProps,
  ElementTabContainerState
> {
  state = {
    datacenters: [],
    currDatacenter: ALL_DATACENTERS,
  };

  onDatacenterSelect = (datacenter: DatacenterObject) => {
    this.setState({
      currDatacenter: datacenter,
    });
  };
  getDatacenters = () => {
    const headers = getHeaders(this.props.token);
    axios
      .post(API_ROOT + "api/sites/datacenters/get-many", {}, headers)
      .then((res) => {
        const datacenters = res.data.datacenters as Array<DatacenterObject>;
        datacenters.push(ALL_DATACENTERS);
        this.setState({
          datacenters,
        });
      })
      .catch((err) => {});
  };
  componentDidMount = () => {
    this.getDatacenters();
  };

  getTabName = (pathname: string) => {
    if (pathname === "/dashboard") {
      return ElementType.ASSET;
    }
    const regex = new RegExp("dashboard/(.*$)");
    const match = regex.exec(pathname);
    if (match) {
      return match[1];
    }
  };
  private handleTabClick(tab:string){
    if(tab==="assets-parent"){
      this.props.history.push(ROUTES.ASSETS)
    }
    else if(tab==="sites"){
      this.props.history.push(ROUTES.DATACENTERS)
    }
    else {
      this.props.history.push("/dashboard/" + tab)
    }

  }
  public render() {
    return (
      <Tabs
        className={Classes.DARK + " element-view "}
        animate={true}
        id="ElementViewer"
        key={"vertical"}
        selectedTabId={this.getTabName(this.props.location.pathname)}
        renderActiveTabPanelOnly={false}
        vertical={true}
        large
        onChange={(tab: string) => this.handleTabClick(tab)}
      >

        <Tab
          className="tab-header do-not-print"
          id="assets-parent"
          title="Assets"
        />

        <Tab
          className="tab-sub do-not-print"
          id="assets"
          title="Racked Assets"
          panel={
            <ElementTab
              datacenters={this.state.datacenters}
              currDatacenter={this.state.currDatacenter}
              onDatacenterSelect={this.onDatacenterSelect}
              {...this.props}
              element={ElementType.ASSET}
              isActive={false}
            />
          }
        />

        <Tab
          className="tab-sub do-not-print"
          id="stored-assets"
          title="Stored Assets"
          panel={
            <ElementTab
              datacenters={this.state.datacenters}
              currDatacenter={this.state.currDatacenter}
              onDatacenterSelect={this.onDatacenterSelect}
              {...this.props}
              element={ElementType.ASSET}
              isActive={false}
            />
          }
        />

        <Tab
          className="tab-sub do-not-print"
          id="decommissioned-assets"
          title="Decommissioned Assets"
          panel={
            <ElementTab
              datacenters={this.state.datacenters}
              currDatacenter={this.state.currDatacenter}
              onDatacenterSelect={this.onDatacenterSelect}
              {...this.props}
              element={ElementType.ASSET}
              isActive={false}
            />
          }
        />

        <Tab
          className="tab do-not-print"
          id="models"
          title="Models"
          panel={<ElementTab {...this.props} element={ElementType.MODEL} />}
        />
            <Tab
          className="tab"
          id="racks"
          title="Racks"
          panel={
            <RackTab
              datacenters={this.state.datacenters}
              currDatacenter={this.state.currDatacenter}
              onDatacenterSelect={this.onDatacenterSelect}
            />
          }
        />


        <Tab
          className="tab-header do-not-print"
          id="sites"
          title="Sites"
        />


        <Tab
          className="tab-sub do-not-print"
          id="datacenters"
          title="Datacenters"
          disabled={
            !(
              this.props.permissionState.admin ||
              this.props.permissionState.asset_management
            )
          }
          panel={
            <ElementTab
              {...this.props}
              updateDatacenters={this.getDatacenters}
              element={ElementType.DATACENTER}
            />
          }
        />

        <Tab
          className="tab-sub do-not-print"
          id="offline-storage-sites"
          title="Offline Storage Sites"
          disabled={
            !(
              this.props.permissionState.admin ||
              this.props.permissionState.asset_management
            )
          }
          panel={
            <ElementTab
              {...this.props}
              element={ElementType.OFFLINE_STORAGE_SITE}
            />
          }
        />

        <Tabs.Expander />
      </Tabs>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    isAdmin: state.admin,
    permissionState: state.permissionState,
    token: state.token,
  };
};

export default connect(mapStateToProps)(ElementTabContainer);

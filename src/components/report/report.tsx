import {
  Classes,
  Button,
  FormGroup,
  MenuItem,
  Tab,
  Tabs,
  TabId,
  Spinner,
  Callout,
} from "@blueprintjs/core";
import * as React from "react";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../utils/api-config";
import "./report.scss";
import {
  DatacenterSelect,
  filterDatacenter,
  renderDatacenterItem,
} from "../../forms/formUtils";
import { DatacenterObject, getHeaders } from "../../utils/utils";
import { IconNames } from "@blueprintjs/icons";

interface ReportProps {
  token: string;
}

interface Allocation {
  allocationPercent: number;
}

interface ModelAlloc extends Allocation {
  model_number: string;
  vendor: string;
}

interface OwnerAlloc extends Allocation {
  owner: string;
}

interface VendorAlloc extends Allocation {
  vendor: string;
}

interface ReportState {
  freeRack: number;
  model_allocation: Array<ModelAlloc>;
  owner_allocation: Array<OwnerAlloc>;
  vendor_allocation: Array<VendorAlloc>;
  stateLoaded: boolean;
  datacenter?: DatacenterObject;
  datacenterOptions?: Array<DatacenterObject>;
  selectedTab: string;
  noData: boolean;
}

export class Report extends React.PureComponent<
  ReportProps & RouteComponentProps
> {
  public state: ReportState = {
    freeRack: 0,
    model_allocation: [],
    owner_allocation: [],
    vendor_allocation: [],
    stateLoaded: false,
    selectedTab: "global",
    noData: false,
  };

  private modelFields = {
    vendor: "Vendor",
    model_number: "Model Number",
    allocation_percent: "% of Used Rackspace",
  };
  private ownerFields = {
    owner: "Owner",
    allocation_percent: "% of Used Rackspace",
  };
  private vendorFields = {
    vendor: "Vendor",
    allocation_percent: "% of Used Rackspace",
  };

  private getReportData(datacenter?: DatacenterObject) {
    this.setState({ stateLoaded: false });
    let path = "";
    if (datacenter) {
      path = "datacenter/" + datacenter.id;
    } else {
      path = "global";
    }
    const headers = {
      headers: {
        Authorization: "Token " + this.props.token,
      },
    };
    axios
      .get(API_ROOT + "api/report/" + path, headers)
      .then((res) => {
        if (res.data.warning_message) {
          this.setState({ stateLoaded: true, noData: true });
        } else {
          this.setState({
            freeRack: res.data.free_rackspace_percent,
            model_allocation: res.data.model_allocation,
            owner_allocation: res.data.owner_allocation,
            vendor_allocation: res.data.vendor_allocation,
            stateLoaded: true,
            noData: false,
          });
        }
      })
      .catch((err) => {
        this.setState({ stateLoaded: true, noData: true });
      });
  }

  private handleDatacenterSelect(datacenter: DatacenterObject) {
    this.setState({
      datacenter: datacenter,
    });
    this.getReportData(datacenter);
  }

  private handleTabSelect(newTab: TabId) {
    this.setState({
      freeRack: 0,
      model_allocation: [],
      owner_allocation: [],
      vendor_allocation: [],
      stateLoaded: false,
      noData: false,
    });
    if (newTab === "global") {
      this.getReportData();
    } else {
      this.setState({
        datacenter: undefined,
      });
    }
    this.setState({ selectedTab: newTab });
  }

  private showReport = () => {
    return (
      <div>
        {this.state.stateLoaded ? (
          this.state.noData ? (
            <Callout
              title="No existing racks or assets."
              icon={IconNames.INFO_SIGN}
            />
          ) : (
            <div>
              <h2 className={"report-summary"}>Rack Usage</h2>
              <Callout className="report-card">
                <p>Free: {(this.state.freeRack * 100).toFixed(2)}%</p>
                <p>Used: {((1 - this.state.freeRack) * 100).toFixed(2)}%</p>
              </Callout>
              <h2 className={"report-summary"}>Allocation of Used Rackspace</h2>
              <Callout className="report-card">
                <div className={"row"}>
                  <div className={"column-third-report"}>
                    <h3>Used rackspace by vendor:</h3>
                  </div>
                  <div className={"column-third-right-report"}>
                    <h3>Used rackspace by model:</h3>
                  </div>
                  <div className={"column-third-right-report"}>
                    <h3>Used rackspace by owner:</h3>
                  </div>
                </div>
                <div className={"row"}>
                  <div className={"column-third-report"}>
                    <Tabular
                      data={this.state.vendor_allocation}
                      fields={this.vendorFields}
                    />
                  </div>
                  <div className={"column-third-right-report"}>
                    <Tabular
                      data={this.state.model_allocation}
                      fields={this.modelFields}
                    />
                  </div>
                  <div className={"column-third-right-report"}>
                    <Tabular
                      data={this.state.owner_allocation}
                      fields={this.ownerFields}
                    />
                  </div>
                </div>
              </Callout>
            </div>
          )
        ) : this.state.selectedTab === "global" || this.state.datacenter ? (
          <Spinner />
        ) : null}
      </div>
    );
  };

  private showDatacenterReport = () => {
    return (
      <div>
        <h2>Select a datacenter</h2>
        <div>
          <Callout className={"report-card"}>
            <FormGroup label="Datacenter" inline={true}>
              {this.state.datacenterOptions ? (
                <DatacenterSelect
                  popoverProps={{
                    minimal: true,
                    popoverClassName: "dropdown",
                    usePortal: true,
                  }}
                  items={this.state.datacenterOptions}
                  onItemSelect={(datacenter: DatacenterObject) => {
                    this.handleDatacenterSelect(datacenter);
                  }}
                  itemRenderer={renderDatacenterItem}
                  itemPredicate={filterDatacenter}
                  noResults={<MenuItem disabled={true} text="No results." />}
                >
                  <Button
                    rightIcon="caret-down"
                    text={
                      this.state.datacenter && this.state.datacenter.name
                        ? this.state.datacenter.name
                        : "Select a datacenter"
                    }
                  />
                </DatacenterSelect>
              ) : null}
            </FormGroup>
          </Callout>
        </div>
        {this.showReport()}
      </div>
    );
  };

  componentDidMount() {
    axios
      .post(
        API_ROOT + "api/sites/datacenters/get-many",
        {},
        getHeaders(this.props.token)
      )
      .then((res) => {
        const dcs = res.data.datacenters as Array<DatacenterObject>;
        this.setState({
          datacenterOptions: dcs,
        });
        this.getReportData();
      });
  }

  render() {
    return (
      <div className={Classes.DARK + " report-all report-view"}>
        <h1>Report</h1>
        <Tabs
          className={"report-all"}
          id="ReportTabs"
          selectedTabId={this.state.selectedTab}
          animate={true}
          onChange={(newTab: TabId) => {
            this.handleTabSelect(newTab);
          }}
        >
          <Tab
            className={"report-all report-tab"}
            id="global"
            title="Global Report"
            panel={this.showReport()}
          />
          <Tab
            className={"report-all report-tab"}
            id="datacenter"
            title="Datacenter Report"
            panel={this.showDatacenterReport()}
          />
        </Tabs>
      </div>
    );
  }
}

interface TabProps {
  data: Array<Allocation>;
  fields: any;
}

class Tabular extends React.PureComponent<TabProps> {
  render() {
    return (
      <table
        className={
          "bp3-html-table bp3-interactive bp3-html-table-bordered bp3-html-table-striped"
        }
      >
        <thead>
          <tr>
            {Object.keys(this.props.data[0]).map((item: string) => {
              return <th>{this.props.fields[item]}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {this.props.data.map((entry: any) => {
            return (
              <tr>
                {Object.keys(entry).map((item: string) => {
                  if (item === "owner" && entry[item] === null)
                    entry[item] = "(No owner)";
                  if (item === "allocation_percent")
                    return <td>{(entry[item] * 100).toFixed(2)}</td>;
                  else return <td>{entry[item]}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
  };
};

export default withRouter(connect(mapStatetoProps)(Report));

import { Classes, Card, Elevation, AnchorButton, Button, FormGroup, MenuItem, Tab, Tabs, TabId, Alert } from "@blueprintjs/core";
import * as React from "react";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../utils/api-config";
import "./report.scss";
import { DatacenterSelect, filterDatacenter, renderDatacenterItem } from "../../forms/formUtils";
import { DatacenterObject, getHeaders } from "../../utils/utils";

interface ReportProps {
  token: string;
}

interface Allocation {
  alloc_pct: number;
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
  datacenterSelectionAlert: boolean;
  freeRack: number;
  model_allocation: Array<ModelAlloc>;
  owner_allocation: Array<OwnerAlloc>;
  vendor_allocation: Array<VendorAlloc>;
  state_loaded: boolean;
  datacenter?: DatacenterObject;
  datacenters?: Array<DatacenterObject>;
  selectedTab: string;
  datacenter_loaded: boolean
}
var console: any = {};
console.log = function () { };

export class Report extends React.PureComponent<
  ReportProps & RouteComponentProps
  > {
  public state: ReportState = {
    freeRack: 0,
    model_allocation: [],
    owner_allocation: [],
    vendor_allocation: [],
    state_loaded: false,
    selectedTab: "global",
    datacenter_loaded: false,
    datacenterSelectionAlert: false
  };

  private modelFields = {
    vendor: "Vendor",
    model_number: "Model Number",
    allocation_percent: "Allocation %"
  };
  private ownerFields = {
    owner: "Owner",
    allocation_percent: "Allocation %"
  };
  private vendorFields = {
    vendor: "Vendor",
    allocation_percent: "Allocation %"
  };

  showReport = (field: string) => {
    return (
      <div>
        {this.state.state_loaded ? <Card elevation={Elevation.TWO}>
          <h2 className={"report-title"}>{field} Datacenter Report</h2>
          <h4 className={"report-summary"}>Percent of unused rack space: {(this.state.freeRack * 100).toFixed(2)}%</h4>
          <h4 className={"report-summary"}>Allocation of used rack space:</h4>
          <div className={"row"}>
            <div className={"column-third-report"}>
              <h5>Used rack space by vendor:</h5>
            </div>
            <div className={"column-third-right-report"}>
              <h5>Used rack space by model:</h5>
            </div>
            <div className={"column-third-right-report"}>
              <h5>Used rack space by owner:</h5>
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
        </Card> : null}
      </div>
    )
  }

  showDatacenterReport = () => {
    return (
      <div>
        <Card elevation={Elevation.TWO} className={"row"}>
          {this.state.datacenters ? <FormGroup label="" inline={true}>
            <DatacenterSelect
              popoverProps={{
                minimal: true,
                popoverClassName: "dropdown",
                usePortal: true
              }}
              items={this.state.datacenters!}
              onItemSelect={(datacenter: DatacenterObject) => {
                this.onDatacenterSelect(datacenter);
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
                    : "Select datacenter"
                }
              />
            </DatacenterSelect>
          </FormGroup> : null}
          <AnchorButton
            small
            text={"View Datacenter Report"}
            onClick={() => {
              if (!this.state.datacenter) {
                this.setState({
                  datacenterSelectionAlert: true
                })
              } else {
                getDatacenterReport(this.props.token, this.state.datacenter).then(result => {
                  this.setState({
                    freeRack: result.free_rackspace_percent,
                    model_allocation: result.model_allocation,
                    owner_allocation: result.owner_allocation,
                    vendor_allocation: result.vendor_allocation,
                    datacenter_loaded: true,
                    state_loaded: true
                  })
                })
              }
            }}
          />
        </Card>
        {this.state.datacenter_loaded ? this.showReport(this.state.datacenter!.name) : null}
      </div>
    )
  }

  onDatacenterSelect = (datacenter: DatacenterObject) => {
    this.setState({
      datacenter: datacenter
    });
  };

  componentDidMount() {
    axios.post(API_ROOT + "api/datacenters/get-many", {}, getHeaders(this.props.token))
      .then(res => {
        const dcs = res.data.datacenters as Array<DatacenterObject>;
        this.setState({
          datacenters: dcs
        })
        getGlobalReport(this.props.token).then(result => {
          this.setState({
            freeRack: result.free_rackspace_percent,
            model_allocation: result.model_allocation,
            owner_allocation: result.owner_allocation,
            vendor_allocation: result.vendor_allocation,
            state_loaded: true
          })
        })
      })
  }

  render() {
    return (
      <div className={Classes.DARK + " report-all"}>
        <Tabs
          className={"report-all"}
          id="ReportTabs"
          selectedTabId={this.state.selectedTab}
          animate={true}
          onChange={(newTab: TabId) => {
            this.setState({
              freeRack: 0,
              model_allocation: [],
              owner_allocation: [],
              vendor_allocation: [],
              state_loaded: false,
              datacenter_loaded: false
            })
            if (newTab === "global") {
              getGlobalReport(this.props.token).then(result => {
                this.setState({
                  freeRack: result.free_rackspace_percent,
                  model_allocation: result.model_allocation,
                  owner_allocation: result.owner_allocation,
                  vendor_allocation: result.vendor_allocation,
                  state_loaded: true
                })
              })
            } else {
              this.setState({
                datacenter: undefined,
                datacenter_loaded: false
              })
            }
            this.setState({ selectedTab: newTab })
          }}
        >
          <Tab className={"report-all"} id="global" title="Global Report" panel={this.showReport("Global")} />
          <Tab className={"report-all"} id="datacenter" title="Datacenter Report" panel={this.showDatacenterReport()} />
        </Tabs>
        <Alert
          isOpen={this.state.datacenterSelectionAlert}
          confirmButtonText={"OK"}
          onConfirm={() => {
            this.setState({
              datacenterSelectionAlert: false
            })
          }}
        >
          <p>Error: must select a datacenter</p>
        </Alert>
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
              console.log(item);
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

async function getGlobalReport(token: string) {
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  };
  return await axios.get(API_ROOT + "api/report/global", headers).then(res => {
    return res.data;
  });
}

async function getDatacenterReport(token: string, datacenter: DatacenterObject) {
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  };
  return await axios.get(API_ROOT + "api/report/datacenter/" + datacenter.id, headers).then(res => {
    return res.data;
  })
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(Report));

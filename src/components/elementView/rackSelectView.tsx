import { Button, Callout, Intent, Switch, FormGroup, MenuItem } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { handleBooleanChange } from "@blueprintjs/docs-theme";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import "../../forms/forms.scss";
import { updateObject } from "../../store/utility";
import { getHeaders, RackRangeFields, DatacenterObject } from "../../utils/utils";
import axios from "axios";
import { API_ROOT } from "../../utils/api-config";
import "./elementView.scss";
import RackRangeForm from "../../forms/rackRangeForm";
import {
  DatacenterSelect,
  renderDatacenterItem,
  filterDatacenter
} from "../../forms/formUtils";
interface RackSelectViewState {
  viewRange: boolean;
  values: RackRangeFields;
  datacenters: Array<DatacenterObject>;
  errors: Array<string>;
}
var console: any = {};
console.log = function () { };

interface RackSelectViewProps {
  token: string;
  submitForm(model: RackRangeFields, headers: any): Promise<any> | void;
}
class RackSelectView extends React.Component<
  RackSelectViewProps & RouteComponentProps,
  RackSelectViewState
  > {
  public state = {
    viewRange: false,
    values: {} as RackRangeFields,
    datacenters: [],
    errors: []
  };
  private handleSwitchChange = handleBooleanChange(viewRange => {
    this.setState({ viewRange: viewRange });
    if (!viewRange) {
      this.setState({
        values: updateObject(this.state.values, {
          letter_end: undefined,
          num_end: undefined
        })
      });
    }
  });

  handleChange = (field: { [key: string]: any }) => {
    this.setState({
      values: updateObject(this.state.values, {
        ...field
      })
    });
  };

  handleSubmit = (e: any) => {
    this.setState({
      errors: []
    });

    e.preventDefault();

    const headers = getHeaders(this.props.token);
    this.props.submitForm(this.state.values, headers);
  };
  renderRackOptions(range: boolean) { }
  componentDidMount() { }

  getDatacenters = (token: string) => {
    const headers = getHeaders(token);
    console.log(API_ROOT + "api/datacenters/get-all");
    axios
      .get(API_ROOT + "api/datacenters/get-all", headers)
      .then(res => {
        console.log(res.data.datacenters);
        this.setState({
          datacenters: res.data.datacenters as Array<DatacenterObject>
        });
      })
      .catch(err => {
        console.log(err);
      });
  };

  getDatacenterName = (datacenterId: string) => {
    for (let i in this.state.datacenters) {
      let datacenter: DatacenterObject = this.state.datacenters[i]
      if (datacenter.id === datacenterId) {
        return datacenter.name;
      }
    }
  };

  render() {
    if (this.state.datacenters.length === 0) {
      this.getDatacenters(this.props.token);
    }
    const { values } = this.state;
    return (
      <div>
        <div>
          {this.state.errors.map((err: string) => {
            return <Callout intent={Intent.DANGER}>{err}</Callout>;
          })}
          <form
            onSubmit={this.handleSubmit}
            className="create-form bp3-form-group"
          >
            <FormGroup label="Datacenter" inline={false}>
              <DatacenterSelect
                popoverProps={{
                  minimal: true,
                  popoverClassName: "dropdown",
                  usePortal: true
                }}
                items={this.state.datacenters}
                onItemSelect={(datacenter: DatacenterObject) =>
                  this.setState({
                    values: updateObject(values, { datacenter: datacenter.id })
                  })
                }
                itemRenderer={renderDatacenterItem}
                itemPredicate={filterDatacenter}
                noResults={<MenuItem disabled={true} text="No results." />}
              >
                <Button
                  rightIcon="caret-down"
                  text={
                    this.state.values.datacenter
                      ? this.getDatacenterName(this.state.values.datacenter)
                      : "Select a datacenter"
                  }
                />
              </DatacenterSelect>
            </FormGroup>
            <Switch
              defaultChecked={false}
              onChange={this.handleSwitchChange}
              label="Rack Range"
            />
            <div className="rack-select">
              <RackRangeForm
                className="rack-field"
                handleChange={this.handleChange}
                range={this.state.viewRange}
              />

              <div className="rack-field ">
                <Button className="button" type="submit">
                  Submit
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};

export default connect(mapStateToProps)(withRouter(RackSelectView));

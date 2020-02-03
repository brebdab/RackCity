import { Button, Callout, Intent, Switch } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { handleBooleanChange } from "@blueprintjs/docs-theme";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../api-config";
import "../../forms/forms.scss";
import { updateObject } from "../../store/utility";
import { getHeaders } from "../utils";
import "./elementView.scss";
import RackRangeOptions from "./rackRangeOptions";
interface rackSelectViewState {
  viewRange: boolean;
  values: RackRangeFields;
  errors: Array<string>;
}
export interface RackRangeFields {
  letter_start: string;
  letter_end: string;
  num_start: number;
  num_end: number;
}
interface rackSelectViewProps {
  token: string;
}
class RackSelectView extends React.Component<
  rackSelectViewProps & RouteComponentProps,
  rackSelectViewState
> {
  public state = {
    viewRange: false,
    values: {} as RackRangeFields,
    errors: []
  };
  private handleSwitchChange = handleBooleanChange(viewRange =>
    this.setState({ viewRange: viewRange })
  );

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

    axios
      .post(API_ROOT + "api/racks/get", this.state.values, headers)
      .then(res => {
        console.log(this.props.location.state);
        this.props.history.replace("/racks", res.data.racks);
        this.props.history.push({
          pathname: "/racks",
          state: res.data.racks
        });
      })
      .catch(err => {
        console.log(err.response.data.failure_message);
        let errors: Array<string> = this.state.errors;
        errors.push(err.response.data.failure_message as string);
        this.setState({
          errors: errors
        });
      });

    // this.props.history.push({
    //   pathname: "/racks",
    //   search: queryString.stringify(this.state.values)
    // });
  };
  renderRackOptions(range: boolean) {}
  componentDidMount() {}
  render() {
    return (
      <div>
        {this.state.errors.map((err: string) => {
          return <Callout intent={Intent.DANGER}>{err}</Callout>;
        })}
        <form
          onSubmit={this.handleSubmit}
          className="create-form bp3-form-group"
        >
          <Switch
            defaultChecked={false}
            onChange={this.handleSwitchChange}
            label="View Range of Racks"
          />
          <div className="rack-select">
            <RackRangeOptions
              className="rack-field"
              handleChange={this.handleChange}
              range={this.state.viewRange}
            />

            <div className="rack-field ">
              {this.state.viewRange ? (
                <Button className="button" icon="search" type="submit">
                  View Racks
                </Button>
              ) : (
                <Button className="button" icon="search" type="submit">
                  View Rack
                </Button>
              )}
            </div>
          </div>
        </form>
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

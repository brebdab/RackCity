import { Button, Callout, Intent, Spinner } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { handleBooleanChange } from "@blueprintjs/docs-theme";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import "../../forms/forms.scss";
import RackRangeForm from "../../forms/rackRangeForm";
import { updateObject } from "../../store/utility";
import {
  DatacenterObject,
  getHeaders,
  RackRangeFields
} from "../../utils/utils";
import "./elementView.scss";
interface RackSelectViewState {
  viewRange: boolean;
  values: RackRangeFields;

  errors: Array<string>;
}
// var console: any = {};
// console.log = function() {};

interface RackSelectViewProps {
  token: string;
  currDatacenter?: DatacenterObject;
  loading?: boolean;

  submitForm(
    model: RackRangeFields,
    headers: any,
    showError: boolean
  ): Promise<any> | void;
}
class RackSelectView extends React.Component<
  RackSelectViewProps & RouteComponentProps,
  RackSelectViewState
> {
  public state = {
    viewRange: false,
    values: {} as RackRangeFields,

    errors: []
  };
  componentWillReceiveProps(nextProps: RackSelectViewProps) {
    console.log(nextProps.currDatacenter, this.props.currDatacenter);
    if (nextProps.currDatacenter !== this.props.currDatacenter) {
      console.log("NEW DATACENTER", nextProps);
      this.setState({
        values: {
          letter_start: "",
          letter_end: "",
          num_start: "",
          num_end: "",
          datacenter: ""
        } as RackRangeFields
      });
    }
  }
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
    const values: any = this.state.values;
    Object.entries(values).forEach(([field, value]) => {
      if (value === "") {
        values[field] = undefined;
      }
    });

    const headers = getHeaders(this.props.token);
    const resp = this.props.submitForm(values, headers, true);
    if (resp) {
      resp.catch(err => {
        console.log(err.response.data.failure_message);
        let errors: Array<string> = this.state.errors;
        errors.push(err.response.data.failure_message as string);
        this.setState({
          errors: errors
        });
      });
    }
  };
  renderRackOptions(range: boolean) {}
  componentDidMount() {}

  render() {
    console.log(this.state.values);
    return (
      <div>
        {this.state.errors.map((err: string) => {
          return <Callout intent={Intent.DANGER}>{err}</Callout>;
        })}
        <form onSubmit={this.handleSubmit} className="rack-form bp3-form-group">
          <div className="rack-select">
            <RackRangeForm
              className="rack-field"
              handleChange={this.handleChange}
              values={this.state.values}
            />

            <div className="rack-field ">
              <Button className="button" type="submit">
                Submit
              </Button>
              {this.props.loading ? (
                <div>
                  <p>processing request... </p>
                  <Spinner size={Spinner.SIZE_SMALL} />
                </div>
              ) : null}
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

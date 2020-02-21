import { Button, Callout, Intent, Switch } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { handleBooleanChange } from "@blueprintjs/docs-theme";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import "../../forms/forms.scss";
import RackRangeForm from "../../forms/rackRangeForm";
import { updateObject } from "../../store/utility";
import { getHeaders, RackRangeFields } from "../../utils/utils";
import "./elementView.scss";
interface RackSelectViewState {
  viewRange: boolean;
  values: RackRangeFields;

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

  render() {
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

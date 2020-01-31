import {
  Button,
  Callout,
  FormGroup,
  Intent,
  MenuItem,
  Switch
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { handleBooleanChange } from "@blueprintjs/docs-theme";
import { Suggest } from "@blueprintjs/select";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../api-config";
import Field from "../../forms/field";
import "../../forms/forms.scss";
import { filterString, renderStringItem } from "../../forms/formUtils";
import { updateObject } from "../../store/utility";
import { getHeaders } from "../utils";
import "./elementView.scss";
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
        console.log(res);
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
            <FormGroup className="rack-field" label="Rack Letter ">
              <Field
                field="letter_start"
                type="text"
                onChange={this.handleChange}
              />
            </FormGroup>
            {this.state.viewRange ? (
              <div className="rack-select">
                <FormGroup className="rack-field" label="Rack Letter (end)">
                  <Field
                    field="letter_end"
                    type="text"
                    onChange={this.handleChange}
                  />
                </FormGroup>
              </div>
            ) : null}
            <FormGroup className="rack-field" label="Row number">
              <Field
                value={this.state.values.num_start}
                field="num_start"
                type="number"
                onChange={this.handleChange}
              />
            </FormGroup>
          </div>
          {this.state.viewRange ? (
            <FormGroup className="rack-field" label="Row number (end)">
              <Field
                value={this.state.values.num_end}
                field="num_end"
                type="number"
                onChange={this.handleChange}
              />
            </FormGroup>
          ) : null}
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
        </form>
      </div>
    );
  }
}
const RackSuggest = Suggest.ofType<string>();
const alphabet = "A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z".split(
  ","
);

const mapStateToProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};

export default connect(mapStateToProps)(withRouter(RackSelectView));

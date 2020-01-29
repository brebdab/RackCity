import {
  Button,
  Callout,
  Classes,
  FormGroup,
  Intent,
  MenuItem
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { connect } from "react-redux";
import { getElementData } from "../components/elementView/elementView";
import {
  InstanceObject,
  ModelObject,
  InstanceInfoObject,
  getHeaders,
  RackObject
} from "../components/utils";
import { updateObject } from "../store/utility";
import Field from "./field";
import "./forms.scss";
import {
  filterModel,
  ModelSuggest,
  renderModelItem,
  RackSuggest,
  renderRackItem,
  filterRack
} from "./formUtils";
import axios from "axios";
import { API_ROOT } from "../api-config";

//TO DO : add validation of types!!!
export enum FormTypes {
  CREATE = "create",
  MODIFY = "modify"
}

export interface InstanceFormProps {
  token: string;
  type: FormTypes;
  initialValues?: InstanceObject;
  submitForm(Instance: InstanceInfoObject, headers: any): Promise<any>;
}
interface InstanceFormState {
  values: InstanceObject;
  racks: Array<RackObject>;
  models: Array<ModelObject>;
  errors: Array<string>;
}

export const required = (
  values: InstanceObject,
  fieldName: keyof InstanceObject
): string =>
  values[fieldName] === undefined ||
  values[fieldName] === null ||
  values[fieldName] === ""
    ? "This must be populated"
    : "";

class InstanceForm extends React.Component<
  InstanceFormProps,
  InstanceFormState
> {
  initialState: InstanceObject = this.props.initialValues
    ? this.props.initialValues
    : ({} as InstanceObject);
  public state = {
    values: this.initialState,
    racks: [],
    models: [],
    errors: []
  };
  headers = {
    headers: {
      Authorization: "Token " + this.props.token
    }
  };
  private mapInstanceObject = (
    instance: InstanceObject
  ): InstanceInfoObject => {
    console.log(instance);

    const { hostname, id, elevation, owner, comment } = instance;
    const model = instance.model ? instance.model.id : undefined;
    const rack = instance.model ? instance.rack.id : undefined;
    let valuesToSend: InstanceInfoObject = {
      model,
      rack,
      hostname,
      id,
      elevation,
      owner,
      comment
    };
    console.log(valuesToSend);

    return valuesToSend;
  };
  private handleSubmit = (e: any) => {
    this.setState({
      errors: []
    });
    e.preventDefault();
    if (this.state.values) {
      if (this.props.initialValues) {
        this.setState({
          values: updateObject(this.state.values, {
            id: this.props.initialValues.id
          })
        });
      }

      this.props
        .submitForm(this.mapInstanceObject(this.state.values), this.headers)
        .catch(err => {
          console.log(err.response.data.failure_message);
          let errors: Array<string> = this.state.errors;
          errors.push(err.response.data.failure_message as string);
          this.setState({
            errors: errors
          });
        });
    }
  };

  handleChange = (field: { [key: string]: any }) => {
    this.setState({
      values: updateObject(this.state.values, {
        ...field
      })
    });
  };
  getRacks = (token: string) => {
    const headers = getHeaders(token);
    axios.get(API_ROOT + "/api/racks/summary").then(res => {
      this.setState({
        racks: res.data
      });
    });
  };
  render() {
    console.log(this.state.values);
    if (this.state.models.length === 0) {
      getElementData("models", this.props.token).then(res => {
        this.setState({
          models: res as Array<ModelObject>
        });
      });
    }
    if (this.state.racks.length === 0) {
      this.getRacks(this.props.token);
    }
    const { values } = this.state;
    return (
      <div className={Classes.DARK + " login-container"}>
        {this.state.errors.map((err: string) => {
          return <Callout intent={Intent.DANGER}>{err}</Callout>;
        })}
        <form
          onSubmit={this.handleSubmit}
          className="create-form bp3-form-group"
        >
          <h2>Add a New Instance</h2>

          <FormGroup>
            <Field
              className="field"
              placeholder="hostname"
              onChange={this.handleChange}
              value={values.hostname}
              field="hostname"
            />
          </FormGroup>
          <FormGroup>
            <Field
              field="elevation"
              className="field"
              placeholder="elevation"
              value={values.elevation}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="Model" inline={true}>
            <ModelSuggest
              popoverProps={{
                minimal: true,
                popoverClassName: "model-options",
                usePortal: true
              }}
              defaultSelectedItem={this.state.values.model}
              inputValueRenderer={(model: ModelObject) =>
                model.vendor + " " + model.model_number
              }
              items={this.state.models}
              onItemSelect={(model: ModelObject) =>
                this.setState({
                  values: updateObject(values, { model: model })
                })
              }
              itemRenderer={renderModelItem}
              itemPredicate={filterModel}
              noResults={<MenuItem disabled={true} text="No results." />}
            />
          </FormGroup>
          <FormGroup label="Rack" inline={true}>
            <RackSuggest
              popoverProps={{
                minimal: true,
                popoverClassName: "model-options",
                usePortal: true
              }}
              defaultSelectedItem={this.state.values.rack}
              inputValueRenderer={(rack: RackObject) =>
                rack.row_letter + rack.rack_num
              }
              items={this.state.racks}
              onItemSelect={(rack: RackObject) =>
                this.setState({
                  values: updateObject(values, { rack: rack })
                })
              }
              itemRenderer={renderRackItem}
              itemPredicate={filterRack}
              noResults={<MenuItem disabled={true} text="No results." />}
            />
          </FormGroup>

          <FormGroup>
            <Field
              field="owner"
              className="field"
              placeholder="owner"
              value={values.owner}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup>
            <Field
              field="comment"
              className="field"
              placeholder="comment"
              value={values.comment}
              onChange={this.handleChange}
            />
          </FormGroup>

          <Button className="login-button" type="submit">
            Submit
          </Button>
        </form>
      </div>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    token: state.token
  };
};
export default connect(mapStateToProps)(InstanceForm);
// const WrappedCreateInstanceForm = Form.create()(CreateInstanceForm);

// export default connect(mapStateToProps)(WrappedCreateInstanceForm);

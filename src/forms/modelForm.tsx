import {
  Button,
  Callout,
  Classes,
  FormGroup,
  Intent,
  MenuItem
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { API_ROOT } from "../api-config";
import { ModelObject } from "../components/utils";
import { updateObject } from "../store/utility";
import Field from "./field";
import "./forms.scss";
import {
  filterString,
  renderCreateItemOption,
  renderStringItem,
  StringSuggest
} from "./formUtils";
//TO DO : add validation of types!!!
export enum FormTypes {
  CREATE = "create",
  MODIFY = "modify"
}

export interface ModelFormProps {
  token: string;
  type: FormTypes;
  initialValues?: ModelObject;
  submitForm(model: ModelObject, headers: any): Promise<any>;
}
interface ModelFormState {
  values: ModelObject;
  vendors: Array<string>;
  errors: Array<string>;
}

export const required = (
  values: ModelObject,
  fieldName: keyof ModelObject
): string =>
  values[fieldName] === undefined ||
  values[fieldName] === null ||
  values[fieldName] === ""
    ? "This must be populated"
    : "";

class ModelForm extends React.Component<ModelFormProps, ModelFormState> {
  initialState: ModelObject = this.props.initialValues
    ? this.props.initialValues
    : ({} as ModelObject);
  public state = {
    values: this.initialState,
    vendors: [],
    errors: []
  };
  headers = {
    headers: {
      Authorization: "Token " + this.props.token
    }
  };

  private handleSubmit = (e: any) => {
    this.setState({
      errors: []
    });
    e.preventDefault();
    console.log(this.state);
    if (this.state.values) {
      if (this.props.initialValues) {
        console.log(this.props.initialValues);
        this.setState({
          values: updateObject(this.state.values, {
            id: this.props.initialValues.id
          })
        });
      }
      this.props.submitForm(this.state.values, this.headers).catch(err => {
        console.log(err.response.data.failure_message);
        let errors: Array<string> = this.state.errors;
        errors.push(err.response.data.failure_message as string);
        this.setState({
          errors: errors
        });
      });
    }
  };

  private getVendors() {
    axios
      //.get("https://rack-city-dev.herokuapp.com/api/" + path)
      .get(API_ROOT + "api/models/vendors", this.headers)
      .then(res => {
        const vendors: Array<string> = res.data.vendors;
        this.setState({
          vendors: vendors
        });
      })
      .catch(err => {
        console.log(err);
      });
  }

  handleChange = (field: { [key: string]: any }) => {
    this.setState({
      values: updateObject(this.state.values, {
        ...field
      })
    });
  };

  render() {
    console.log(this.state.values);
    if (this.state.vendors.length === 0) {
      this.getVendors();
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
          <h2>Add a New Model</h2>
          <FormGroup label="Vendor">
            <StringSuggest
              popoverProps={{
                minimal: true,
                popoverClassName: "model-options",
                usePortal: true
              }}
              defaultSelectedItem={this.state.values.vendor}
              inputValueRenderer={(vendor: string) => vendor}
              items={this.state.vendors}
              onItemSelect={(vendor: string) =>
                this.setState({
                  values: updateObject(values, { vendor: vendor })
                })
              }
              createNewItemRenderer={renderCreateItemOption}
              createNewItemFromQuery={(vendor: string) => vendor}
              itemRenderer={renderStringItem}
              itemPredicate={filterString}
              noResults={<MenuItem disabled={true} text="No results." />}
            />
          </FormGroup>
          <FormGroup label="Model Number" inline={true}>
            <Field
              className="field"
              placeholder="model_number"
              onChange={this.handleChange}
              value={values.model_number}
              field="model_number"
            />
          </FormGroup>
          <FormGroup label="Height" inline={true}>
            <Field
              field="height"
              className="field"
              placeholder="height"
              value={values.height}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="Display Color" inline={true}>
            <Field
              field="display_color"
              className="field"
              placeholder="display_color"
              value={values.display_color}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="# Ethernet Ports" inline={true}>
            <Field
              field="num_ethernet_ports"
              className="field"
              placeholder="num_ethernet_ports"
              value={values.num_ethernet_ports}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="# Power Ports" inline={true}>
            <Field
              field="num_power_ports"
              className="field"
              placeholder="num_power_ports"
              value={values.num_power_ports}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="CPU" inline={true}>
            <Field
              field="cpu"
              className="field"
              placeholder="cpu"
              value={values.cpu}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="Memory(GB)" inline={true}>
            <Field
              field="memory_gb"
              className="field"
              placeholder="memory_gb"
              value={values.memory_gb}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="Storage" inline={true}>
            <Field
              field="storage"
              className="field"
              placeholder="storage"
              value={values.storage}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="Comment" inline={true}>
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
export default connect(mapStateToProps)(ModelForm);
// const WrappedCreateModelForm = Form.create()(CreateModelForm);

// export default connect(mapStateToProps)(WrappedCreateModelForm);

import {
  Button,
  Callout,
  Classes,
  FormGroup,
  Intent,
  Toaster,
  IToastProps,
  Checkbox,
  Radio,
  RadioGroup,
  Alignment,
  Spinner
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { connect } from "react-redux";
import axios from "axios";
import {
  getHeaders,
  UserPermissionsObject,
  DatacenterObject
} from "../utils/utils";
import "./forms.scss";
import { FormTypes } from "./formUtils";
import { API_ROOT } from "../utils/api-config";
import { modifyUser } from "../components/elementView/elementUtils";

//TO DO : add validation of types!!!
// var console: any = {};
// console.log = function() {};

export interface UserFormProps {
  userId: string;
  token: string;
  type?: FormTypes;
  // submitForm(model: UserPermissionsObject, headers: any): Promise<any> | void;
  submitForm: Function;
}
interface UserFormState {
  initialValues: UserPermissionsObject;
  errors: Array<string>;
  permissions: UserPermissionsObject;
  datacenters: Array<DatacenterObject>;
  datacenter_selection: string;
  loading: boolean;
}

class UserForm extends React.Component<UserFormProps, UserFormState> {
  private toaster: Toaster = {} as Toaster;
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref)
  };

  public state = {
    initialValues: {
      model_management: false,
      asset_management: false,
      power_control: false,
      audit_read: false,
      admin: false,
      datacenter_permissions: [] as Array<string>
    },
    errors: [] as Array<string>,
    permissions: {
      model_management: false,
      asset_management: false,
      power_control: false,
      audit_read: false,
      admin: false,
      datacenter_permissions: [""] as Array<string>
    },
    datacenters: [] as Array<DatacenterObject>,
    datacenter_selection: "Global",
    loading: true
  };

  private handleSubmit = (e: any) => {
    this.setState({
      errors: []
    });
    e.preventDefault();
    console.log("submitting");
    console.log(this.state);
    const body = {
      id: this.props.userId,
      model_management: this.state.permissions.model_management,
      asset_management: this.state.permissions.asset_management,
      power_control: this.state.permissions.power_control,
      audit_read: this.state.permissions.audit_read,
      admin: this.state.permissions.admin,
      datacenter_permissions: this.state.permissions.datacenter_permissions
    };
    const resp = modifyUser(body, getHeaders(this.props.token));
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
    this.props.submitForm();
  };

  componentDidMount() {
    this.getDatacenters().then(res => {
      var data = res.datacenters as Array<DatacenterObject>;
      data.sort(this.compare);
      this.setState({
        datacenters: data
      });
      this.getUserPermissions(this.props.userId);
    });
  }

  render() {
    console.log(this.state);
    return (
      <div>
        {this.state.loading ? (
          <Spinner />
        ) : (
          <div className={Classes.DARK + " login-container"}>
            {this.state.errors.map((err: string) => {
              return <Callout intent={Intent.DANGER}>{err}</Callout>;
            })}
            <h2>Select permissions to grant this user</h2>
            <form
              onSubmit={this.handleSubmit}
              className="create-form bp3-form-group"
            >
              <FormGroup inline={true}>
                <Checkbox
                  label="Administrator"
                  alignIndicator={Alignment.LEFT}
                  checked={this.state.permissions.admin}
                  onChange={() => {
                    let updatedPermissions: UserPermissionsObject;
                    updatedPermissions = {
                      model_management: this.state.permissions.model_management,
                      asset_management: this.state.permissions.asset_management,
                      power_control: this.state.permissions.power_control,
                      audit_read: this.state.permissions.audit_read,
                      admin: !this.state.permissions.admin,
                      datacenter_permissions: this.state.permissions
                        .datacenter_permissions
                    };
                    this.setState({
                      permissions: updatedPermissions
                    });
                  }}
                ></Checkbox>
              </FormGroup>
              <FormGroup inline={true}>
                <Checkbox
                  label="Model Management"
                  alignIndicator={Alignment.LEFT}
                  checked={
                    this.state.permissions.admin
                      ? true
                      : this.state.permissions.model_management
                  }
                  disabled={this.state.permissions.admin}
                  onChange={() => {
                    this.setState({
                      permissions: this.updateBooleanPermissions(
                        "model_management"
                      )
                    });
                  }}
                ></Checkbox>
              </FormGroup>
              <FormGroup inline={true}>
                <Checkbox
                  label="Power Control"
                  alignIndicator={Alignment.LEFT}
                  checked={
                    this.state.permissions.admin
                      ? true
                      : this.state.permissions.power_control
                  }
                  disabled={this.state.permissions.admin}
                  onChange={() => {
                    this.setState({
                      permissions: this.updateBooleanPermissions(
                        "power_control"
                      )
                    });
                  }}
                ></Checkbox>
              </FormGroup>
              <FormGroup inline={true}>
                <Checkbox
                  label="Audit Log"
                  checked={
                    this.state.permissions.admin
                      ? true
                      : this.state.permissions.audit_read
                  }
                  alignIndicator={Alignment.LEFT}
                  disabled={this.state.permissions.admin}
                  onChange={() => {
                    this.setState({
                      permissions: this.updateBooleanPermissions("audit_read")
                    });
                  }}
                ></Checkbox>
              </FormGroup>
              <RadioGroup
                inline={true}
                label="Asset permissions"
                onChange={() => {
                  console.log("changing datacenter");
                  console.log(this.state);
                  var updatedPermissions = this.state.permissions;
                  if (this.state.datacenter_selection === "Global") {
                    let permissions: Array<string>;
                    permissions = [];
                    for (var i = 0; i < this.state.datacenters.length; i++) {
                      permissions.push(this.state.datacenters[i].id);
                    }
                    updatedPermissions.datacenter_permissions = permissions;
                    this.setState({
                      datacenter_selection: "Per Datacenter",
                      permissions: updatedPermissions
                    });
                  } else {
                    updatedPermissions.datacenter_permissions = this.state.initialValues.datacenter_permissions;
                    this.setState({
                      datacenter_selection: "Global",
                      permissions: updatedPermissions
                    });
                  }
                }}
                selectedValue={this.state.datacenter_selection}
              >
                <Radio label="Global" value="Global" />
                <Radio label="Per Datacenter" value="Per Datacenter" />
              </RadioGroup>
              {this.state.datacenter_selection === "Global"
                ? null
                : this.renderDatacenterChecks()}
              <Button className="login-button" type="submit">
                Submit
              </Button>
            </form>
          </div>
        )}
      </div>
    );
  }

  private compare(a: DatacenterObject, b: DatacenterObject) {
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return 0;
  }

  private renderDatacenterChecks() {
    var checks: Array<any>;
    checks = [];
    for (var i = 0; i < this.state.datacenters.length; i++) {
      checks.push(this.renderDatacenter(this.state.datacenters[i]));
    }
    return checks;
  }

  private renderDatacenter(datacenter: DatacenterObject) {
    console.log(
      this.state.permissions.datacenter_permissions.includes(datacenter.id)
    );
    return (
      <FormGroup key={datacenter.name} inline={true}>
        <Checkbox
          label={datacenter.name}
          alignIndicator={Alignment.LEFT}
          checked={this.state.permissions.datacenter_permissions.includes(
            datacenter.id
          )}
          onChange={() => {
            console.log(datacenter);
            var updatedPermissions = this.state.permissions;
            if (
              this.state.permissions.datacenter_permissions.includes(
                datacenter.id
              )
            ) {
              const index = this.state.permissions.datacenter_permissions.indexOf(
                datacenter.id
              );
              updatedPermissions.datacenter_permissions.splice(index, 1);
            } else {
              updatedPermissions.datacenter_permissions.push(datacenter.id);
            }
            this.setState({
              permissions: updatedPermissions
            });
          }}
        ></Checkbox>
      </FormGroup>
    );
  }

  private getDatacenters() {
    const body = {
      sort_by: [],
      filters: []
    };
    return axios
      .post(
        API_ROOT + "api/datacenters/get-many",
        body,
        getHeaders(this.props.token)
      )
      .then(res => {
        return res.data;
      })
      .catch(err => {
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER
        });
      });
  }

  private getUserPermissions(id: string) {
    const body = {
      id: id
    };
    axios
      .post(
        API_ROOT + "api/users/permissions/get",
        body,
        getHeaders(this.props.token)
      )
      .then(res => {
        console.log(res.data);
        this.setState({
          initialValues: res.data,
          permissions: res.data
        });
        if (
          res.data.datacenter_permissions.length ===
          this.state.datacenters.length
        ) {
          this.setState({
            datacenter_selection: "Global"
          });
        } else {
          this.setState({
            datacenter_selection: "Per Datacenter"
          });
        }
        this.setState({
          loading: false
        });
      })
      .catch(err => {
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER
        });
      });
  }

  private updateBooleanPermissions(field: string) {
    let permissions: UserPermissionsObject;
    permissions = this.state.permissions;
    permissions[field] = !permissions[field];
    return permissions;
  }
}

const mapStateToProps = (state: any) => {
  return {
    token: state.token
  };
};
export default connect(mapStateToProps)(UserForm);

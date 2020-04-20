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
  Spinner,
  Position,
  Elevation,
  Card,
  Icon,
  Tooltip,
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { connect } from "react-redux";
import axios from "axios";
import {
  getHeaders,
  UserPermissionsObject,
  DatacenterObject,
} from "../utils/utils";
import "./forms.scss";
import { FormTypes } from "./formUtils";
import { API_ROOT } from "../utils/api-config";
import { modifyUser } from "../components/elementView/elementUtils";

export interface UserFormProps {
  userId: string;
  token: string;
  type?: FormTypes;
  submitForm: Function;
}
export enum AssetPermissionSelection {
  GLOBAL = "Global",
  PER_SITE = "Per-Site",
}
export enum PermissionInfo {
  MODEL = "Allows creation, modification, and deletion of models.",
  ASSET = "Allows creation, modification, decommissioning, and deletion of assets. May be conferred globally or per-site.",
  POWER = "Allows power control of assets for users that are not the explicit owners of the asset in question.",
  AUDIT = "Allows reading of the audit log.",
  ADMIN = "Inherits all of the abilities listed below. Can also confer or revoke permissions onto users.",
}
interface UserFormState {
  initialValues: UserPermissionsObject;
  errors: Array<string>;
  permissions: UserPermissionsObject;
  sites: Array<DatacenterObject>;
  asset_permission_selection: AssetPermissionSelection;
  show_asset_options: boolean;
  loading: boolean;
}

class UserForm extends React.Component<UserFormProps, UserFormState> {
  private toaster: Toaster = {} as Toaster;
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
  };

  public state = {
    initialValues: {
      model_management: false,
      asset_management: false,
      power_control: false,
      audit_read: false,
      admin: false,
      site_permissions: [] as Array<string>,
    },
    errors: [] as Array<string>,
    permissions: {
      model_management: false,
      asset_management: false,
      power_control: false,
      audit_read: false,
      admin: false,
      site_permissions: [""] as Array<string>,
    },
    sites: [] as Array<DatacenterObject>,
    asset_permission_selection: AssetPermissionSelection.GLOBAL,
    loading: true,
    show_asset_options: false,
  };

  private handleSubmit = (e: any) => {
    if (!this.state.show_asset_options) {
      var updatedPermissions = this.state.permissions;
      updatedPermissions.asset_management = false;
      updatedPermissions.site_permissions = [] as Array<string>;
      this.setState({
        permissions: updatedPermissions,
      });
    }
    this.setState({
      errors: [],
    });
    e.preventDefault();
    const body = {
      id: this.props.userId,
      model_management: this.state.permissions.model_management,
      asset_management: this.state.permissions.asset_management,
      power_control: this.state.permissions.power_control,
      audit_read: this.state.permissions.audit_read,
      admin: this.state.permissions.admin,
      site_permissions: this.state.permissions.site_permissions,
    };
    modifyUser(body, getHeaders(this.props.token))
      .then((res) => {
        this.props.submitForm()
      })
      .catch((err) => {
        let errors: Array<string> = this.state.errors;
        errors.push(err.response.data.failure_message as string);
        this.setState({
          errors: errors,
        });
      });
  };

  componentDidMount() {
    this.getSites()
      .then((res) => {
        var data = res.sites as Array<DatacenterObject>;
        data.sort(this.compare);
        this.setState({
          sites: data,
        });
        this.getUserPermissions(this.props.userId);
      })
      .catch((err) => {
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER,
        });
      });
  }

  render() {
    return (
      <div>
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
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
                  label="Administrator  "
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
                      site_permissions: this.state.permissions.site_permissions,
                    };
                    this.setState({
                      permissions: updatedPermissions,
                      show_asset_options: false,
                    });
                  }}
                >
                  <Tooltip
                    content={PermissionInfo.ADMIN}
                    position={Position.RIGHT}
                  >
                    <Icon icon="info-sign" />
                  </Tooltip>
                </Checkbox>
              </FormGroup>
              <FormGroup inline={true}>
                <Checkbox
                  label="Model management permission  "
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
                      ),
                    });
                  }}
                >
                  <Tooltip
                    content={PermissionInfo.MODEL}
                    position={Position.RIGHT}
                  >
                    <Icon icon="info-sign" />
                  </Tooltip>
                </Checkbox>
              </FormGroup>
              <FormGroup inline={true}>
                <Checkbox
                  label="Asset management permission  "
                  checked={
                    this.state.permissions.admin
                      ? true
                      : this.state.show_asset_options
                  }
                  alignIndicator={Alignment.LEFT}
                  disabled={this.state.permissions.admin}
                  onChange={() => {
                    this.setState({
                      show_asset_options: !this.state.show_asset_options,
                    });
                  }}
                >
                  <Tooltip
                    content={PermissionInfo.ASSET}
                    position={Position.RIGHT}
                  >
                    <Icon icon="info-sign" />
                  </Tooltip>
                </Checkbox>
              </FormGroup>
              {this.state.show_asset_options
                ? this.renderAssetPermissionDetails()
                : null}
              <FormGroup inline={true}>
                <Checkbox
                  label="Power permission  "
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
                      ),
                    });
                  }}
                >
                  <Tooltip
                    content={PermissionInfo.POWER}
                    position={Position.RIGHT}
                  >
                    <Icon icon="info-sign" />
                  </Tooltip>
                </Checkbox>
              </FormGroup>
              <FormGroup inline={true}>
                <Checkbox
                  label="Audit permission  "
                  checked={
                    this.state.permissions.admin
                      ? true
                      : this.state.permissions.audit_read
                  }
                  alignIndicator={Alignment.LEFT}
                  disabled={this.state.permissions.admin}
                  onChange={() => {
                    this.setState({
                      permissions: this.updateBooleanPermissions("audit_read"),
                    });
                  }}
                >
                  <Tooltip
                    content={PermissionInfo.AUDIT}
                    position={Position.RIGHT}
                  >
                    <Icon icon="info-sign" />
                  </Tooltip>
                </Checkbox>
              </FormGroup>
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

  private handleAssetPermissionSelection() {
    var updatedPermissions = this.state.permissions;
    if (
      this.state.asset_permission_selection === AssetPermissionSelection.GLOBAL
    ) {
      updatedPermissions.site_permissions = this.state.initialValues.site_permissions;
      updatedPermissions.asset_management = false;
      this.setState({
        asset_permission_selection: AssetPermissionSelection.PER_SITE,
        permissions: updatedPermissions,
      });
    } else {
      let permissions: Array<string>;
      permissions = [];
      for (var i = 0; i < this.state.sites.length; i++) {
        permissions.push(this.state.sites[i].id);
      }
      updatedPermissions.site_permissions = permissions;
      updatedPermissions.asset_management = this.state.show_asset_options;
      this.setState({
        asset_permission_selection: AssetPermissionSelection.GLOBAL,
        permissions: updatedPermissions,
      });
    }
  }

  private renderAssetPermissionDetails() {
    return (
      <Card className="permission-card" elevation={Elevation.ZERO}>
        <RadioGroup
          inline={true}
          label="Select asset permission level"
          onChange={() => {
            this.handleAssetPermissionSelection();
          }}
          selectedValue={this.state.asset_permission_selection}
        >
          <Radio
            label={AssetPermissionSelection.GLOBAL}
            value={AssetPermissionSelection.GLOBAL}
          />
          <Radio
            label={AssetPermissionSelection.PER_SITE}
            value={AssetPermissionSelection.PER_SITE}
          />
        </RadioGroup>
        <div className={"renderSiteChecks"}>
          {this.state.asset_permission_selection ===
          AssetPermissionSelection.PER_SITE
            ? this.renderSiteChecks()
            : null}
        </div>
      </Card>
    );
  }

  private renderSiteChecks() {
    var checks: Array<any>;
    checks = [];
    for (var i = 0; i < this.state.sites.length; i++) {
      checks.push(this.renderSite(this.state.sites[i]));
    }
    return checks;
  }

  private renderSite(site: DatacenterObject) {
    return (
      <FormGroup key={site.name} inline={true}>
        <Checkbox
          label={site.name + " (" + site.abbreviation + ")"}
          alignIndicator={Alignment.LEFT}
          checked={this.state.permissions.site_permissions.includes(site.id)}
          onChange={() => {
            var updatedPermissions = this.state.permissions;
            if (this.state.permissions.site_permissions.includes(site.id)) {
              const index = this.state.permissions.site_permissions.indexOf(
                site.id
              );
              updatedPermissions.site_permissions.splice(index, 1);
            } else {
              updatedPermissions.site_permissions.push(site.id);
            }
            this.setState({
              permissions: updatedPermissions,
            });
          }}
        />
      </FormGroup>
    );
  }

  private getSites() {
    const body = {
      sort_by: [],
      filters: [],
    };
    return axios
      .post(API_ROOT + "api/sites/get-many", body, getHeaders(this.props.token))
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER,
        });
      });
  }

  private getUserPermissions(id: string) {
    const body = {
      id: id,
    };
    axios
      .post(
        API_ROOT + "api/users/permissions/get",
        body,
        getHeaders(this.props.token)
      )
      .then((res) => {
        this.setState({
          initialValues: res.data,
          permissions: res.data,
        });
        if (res.data.asset_management) {
          this.setState({
            asset_permission_selection: AssetPermissionSelection.GLOBAL,
          });
        } else {
          this.setState({
            asset_permission_selection: AssetPermissionSelection.PER_SITE,
          });
        }
        this.setState({
          loading: false,
          show_asset_options:
            this.state.permissions.asset_management ||
            this.state.permissions.site_permissions.length > 0,
        });
      })
      .catch((err) => {
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER,
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
    token: state.token,
  };
};
export default connect(mapStateToProps)(UserForm);

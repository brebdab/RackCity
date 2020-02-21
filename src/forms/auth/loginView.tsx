import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import WrappedNormalLoginForm from "./login";
import { Classes, AnchorButton } from "@blueprintjs/core";
import { connect } from "react-redux";
import "./loginView.scss";
import * as QueryString from "query-string"
import { isNullOrUndefined } from "util";
import * as actions from "../../store/actions/auth";

export interface LoginViewProps {
    token: string;
    onAuth(acess_token: string): any;
}
export class LoginView extends React.PureComponent<RouteComponentProps & LoginViewProps> {
    private handleSSOClick = () => {
        const redirect_uri = window.location.href.replace(new RegExp(':', 'g'), '%3A').replace(new RegExp('/', 'g'), '%2F')
        window.location.href = actions.DUKE_OAUTH_URI + redirect_uri
    };
    public componentDidMount() {
        const params = QueryString.parse(window.location.hash.substring(1))
        const access_token = params.access_token
        if (!isNullOrUndefined(access_token)) {
            this.props.onAuth(access_token.toString());
        }
    }
    public render() {
        return (
            <div className={Classes.DARK + " login-container"}>
                <WrappedNormalLoginForm />
                <AnchorButton onClick={this.handleSSOClick}>SSO Login</AnchorButton>
            </div >
        )
    };
}
const mapStatetoProps = (state: any) => {
    return {
        token: state.token
    };
};
const mapDispatchToProps = (dispatch: any) => {
    return {
        onAuth: (acess_token: string) =>
            dispatch(actions.netidAuthLogin(acess_token))
    };
};
export default connect(mapStatetoProps, mapDispatchToProps)(withRouter(LoginView));

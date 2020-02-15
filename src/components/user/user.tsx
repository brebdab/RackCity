import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { Tabs, Classes, Tab } from "@blueprintjs/core";
import ElementTab from "../elementView/elementTab";
import { RouteComponentProps } from "react-router";
import "../elementView//elementView.scss";
import { connect } from "react-redux";
import { ElementType } from "../../utils/utils";
import RackTab from "../elementView/rackTab";

interface UserProps {
    isAdmin: boolean;
}
class User extends React.Component<
    UserProps & RouteComponentProps
    > {
    public render() {
        return (
            <Tabs
                className={Classes.DARK + " element-view"}
                animate={true}
                id="ElementViewer"
                key={"vertical"}
                renderActiveTabPanelOnly={false}
                vertical={true}
                large
            >
                <Tab
                    className="tab"
                    id="user"
                    title="Users"
                    panel={<ElementTab {...this.props} element={ElementType.USER} />}
                />
            </Tabs>
        );
    }
}

const mapStateToProps = (state: any) => {
    return {
        isAdmin: state.admin
    };
};

export default connect(mapStateToProps)(User);

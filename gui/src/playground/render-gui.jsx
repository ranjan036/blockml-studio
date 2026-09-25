import React from 'react';
import GUI from '../containers/gui.jsx';

// blockml: no cloud variable server (TurboWarp's is clouddata.turbowarp.org), so cloud
// variables behave like normal variables. Nothing about a project leaves the laptop.
const RenderGUI = props => (
    <GUI
        cloudHost={null}
        canUseCloud={false}
        hasCloudPermission={false}
        canSave={false}
        basePath={process.env.ROOT}
        canEditTitle
        {...props}
    />
);

export default RenderGUI;

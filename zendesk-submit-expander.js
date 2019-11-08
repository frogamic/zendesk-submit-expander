HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
HTMLCollection.prototype.forEach = Array.prototype.forEach;
NodeList.prototype.map = Array.prototype.map;

let backupRetry, menuHandler, menuFinder, buttonUpdater, zseButtons;
const BUTTON_GROUP_SELECTOR = '.ticket-resolution-footer div[data-garden-id="buttons.button_group_view"]';

const clearState = () => {
    if (backupRetry) {
        console.log('Clearing backupRetry timer');
        window.clearTimeout(backupRetry);
    }
    if (buttonUpdater) {
        buttonUpdater.disconnect();
    }
    if (menuFinder) {
        menuFinder.disconnect();
        document.getElementsByTagName('BODY')[0].dispatchEvent(new Event('mousedown', { bubbles: true, }));
    }
    backupRetry = undefined;
    menuFinder = undefined;
    menuHandler = undefined;
    buttonUpdater = undefined;
};

const newButton = (status, handler, selected = false) => {
    const button = document.createElement('button');
    button.classList.add('c-btn');
    if (status=="En attente"){
        status="En_attente";
    }
    button.classList.add(`zse-status-${status}`);
    if (selected) {
        button.classList.add('is-selected');
    }
    button.innerHTML = `<span>${status}</span>`;
    button.addEventListener('click', handler);
    return button;
};

const newButtonGroup = (workspace, statuses, activeStatus) => {
    const buttonGroup = document.createElement('div');
    buttonGroup.classList.add('l-btn-group');
    buttonGroup.classList.add('zse-group');
    if (workspace.id) {
        buttonGroup.id = `${workspace.id}_zse`;
    }
    for (let status of statuses) {
        buttonGroup.appendChild(newButton(status, generateClicker(workspace, status), status === activeStatus));
    }
    return buttonGroup;
};

const generateDropUpFinder = (workspace, handler) => {
    if (menuFinder) {
        console.log('Disconnecting menuFinder and clicking out of menu for good measure');
        menuFinder.disconnect();
        document.getElementsByTagName('BODY')[0].dispatchEvent(new Event('mousedown', { bubbles: true, }));
    }

    menuHandler = handler;

    menuFinder = new MutationObserver (mutations => {
        mutations.forEach(mutation => {
            node = mutation.target;
            for (let j = 0; j < 5; j++) {
                menutemp = node.querySelector ? node.querySelector('div[data-garden-id="buttons.button_group_view"]') : undefined;
                if(!menutemp || menutemp == undefined){
                    node = node.parentNode;
                }
            }
            for (let i = 0; i < 10; i++) {
                menutemp.childNodes.forEach(x => {
                    if (x.tagName == "DIV"){
                        menutemp = x;
                    } else {
                        if(x.tagName == "UL"){
                            menutemp = x;
                        }
                    }
                })
            }
            const menu = menutemp;
            if (menu) {
                menuFinder.disconnect();
                menuFinder = undefined;
                menuHandler(menu);
                menuHandler = undefined;
            }
        });
    });
    menuFinder.observe(workspace.querySelector(BUTTON_GROUP_SELECTOR), { childList: true, attributes: true, subtree: true });
    console.log('Triggering submit menu');
    workspace.querySelector(BUTTON_GROUP_SELECTOR).querySelector('button[data-garden-id="buttons.icon_button"]').click();
};

const generateClicker = (workspace, status) => {
    return () => {
        console.log(`${status} click handler called`);
        generateDropUpFinder(workspace, menu => {
            menu.childNodes.forEach(x => {
                if (x.innerText.trim().match(new RegExp(`.*${status}$`, 'i'))) {
                    x.click();
                }
            });
        });
    };
};

const generateButtonUpdater = (workspace) => {
    if (buttonUpdater) {
        buttonUpdater.disconnect();
    }
    buttonUpdater = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.tagName === 'STRONG') {
                    console.log(`#${workspace.id}: Ticket status has changed, recreating button group`);
                    const updateFn = () => {
                        clearState();
                        removeZseButtons(workspace);
                        injectZseButtons(workspace);
                    };
                    const ticketSection = workspace.querySelector('section.ticket.working');
                    if (ticketSection) {
                        console.log(`#${workspace.id}: Waiting for ticket to submit`);
                        const workingWaiter = new MutationObserver(mutations => {
                            mutations.forEach(mutation => {
                                let ready = false;
                                if (mutation.attributeName === 'class' && !ticketSection.classList.contains('working')) {
                                    ready = true;
                                }
                                if (ready) {
                                    workingWaiter.disconnect();
                                    window.setTimeout(updateFn, 5);
                                }
                            });
                        });
                        workingWaiter.observe(ticketSection, { attributes: true });
                    } else {
                        updateFn();
                    }
                }
            });
        });
    });
    buttonUpdater.observe(workspace.querySelector(BUTTON_GROUP_SELECTOR), { childList: true, subtree: true });
};

const injectZseButtons = (workspace) => {
    if (workspace.classList.contains('search')) {
        return;
    }
    const zseGroup = document.getElementById(`${workspace.id}_zse`);
    if (zseGroup) {
        workspace.classList.add('zse-expanded');
    } else {
        const style = workspace.getAttribute('style');
        if (!style || !style.match('.*display:\\s*none;.*')) {
            removeZseButtons();
            console.log(`#${workspace.id}: Injecting buttons`);
            const buttonGroup = workspace.querySelector(BUTTON_GROUP_SELECTOR);
            if (buttonGroup) {
                const submit = buttonGroup.querySelector('button[data-garden-id="buttons.button"]');
                const currentStatus = submit.getElementsByTagName('STRONG')[0];
                if (currentStatus.innerText) {
                    generateDropUpFinder(workspace, menu => {
                        const buttons = menu.childNodes.map(x => x.querySelector('strong').innerText);
                        document.getElementsByTagName('BODY')[0].dispatchEvent(new Event('mousedown', { bubbles: true, }));
                        zseButtons = newButtonGroup(workspace, buttons, currentStatus.innerText);
                        buttonGroup.parentNode.appendChild(zseButtons);
                        generateButtonUpdater(workspace);
                        workspace.classList.add('zse-expanded');
                    });
                }
                if (backupRetry) {
                    window.clearTimeout(backupRetry);
                }
                backupRetry = window.setTimeout(() => injectZseButtons(workspace), 50);
            }
        }
    }
};

const removeZseButtons = (workspace) => {
    let buttonGroup;
    if (workspace) {
        buttonGroup = document.getElementById(`${workspace.id}_zse`);
    } else {
        buttonGroup = zseButtons;
    }
    if (buttonGroup) {
        buttonGroup.remove();
    }
};

const changeWorkspaceFocus = (workspace) => {
    if (workspace.tagName === 'DIV') {
        const style = workspace.getAttribute('style');
        if (!style || !style.match('.*display:\\s*none;.*')) {
            // A new workspace is in the foreground, clear up all state
            clearState();
            try {
                console.log(`#${workspace.id}: ${workspace.querySelector('header nav .btn.active').innerText} has the foreground`);
            } catch (e) {
                console.log(`#${workspace.id}: Unknown ticket has the foreground`);
            }
            injectZseButtons(workspace);
        } else {
            console.log(`#${workspace.id}: Workspace backgrounded`);
            removeZseButtons(workspace);
            workspace.classList.remove('zse-expanded');
        }
    }
};

const workspaceHook = (mutations) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            changeWorkspaceFocus(node);
            const observer = new MutationObserver(workspaceWatcher);
            observer.observe(node, { attributes: true, attributeFilter: ['style'] });
        });
    });
};

const workspaceWatcher = (mutations) => {
    mutations.forEach(mutation => {
        changeWorkspaceFocus(mutation.target);
    });
};

const mutationLoader = () => {
    const mainPanes = document.getElementById('main_panes');
    if (mainPanes) {
        const observer = new MutationObserver(workspaceHook);
        observer.observe(mainPanes, { childList: true });
        mainPanes.childNodes.forEach(x => {
            changeWorkspaceFocus(x);
        });
    } else {
        window.setTimeout(mutationLoader, 100);
    }
};

mutationLoader();

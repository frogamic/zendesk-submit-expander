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
        console.log('Disconnecting buttonUpdater');
        buttonUpdater.disconnect();
    }
    if (menuFinder) {
        console.log('Disconnecting menuFinder and clicking out of menu for good measure');
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
    button.classList.add(`zse-status-${status}`);
    if (selected) {
        button.classList.add('is-selected');
    }
    button.innerHTML = `<span>${status}</span>`;
    button.addEventListener('click', handler);
    return button;
};

const newButtonGroup = (statuses, expander, activeStatus, workspaceId) => {
    const buttonGroup = document.createElement('div');
    buttonGroup.classList.add('l-btn-group');
    buttonGroup.classList.add('zse-group');
    if (workspaceId) {
        buttonGroup.id = `${workspaceId}_zse`;
    }
    for (let status of statuses) {
        buttonGroup.appendChild(newButton(status, generateClicker(status, expander), status === activeStatus));
    }
    return buttonGroup;
};

const generateDropUpFinder = (expander, handler) => {
    if (menuFinder) {
        console.log('Disconnecting menuFinder and clicking out of menu for good measure');
        menuFinder.disconnect();
        document.getElementsByTagName('BODY')[0].dispatchEvent(new Event('mousedown', { bubbles: true, }));
    }

    menuHandler = handler;

    menuFinder = new MutationObserver (mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                const menu = node.querySelector ? node.querySelector('ul[data-garden-id="menus.menu_view"]') : undefined;
                if (menu && menu.innerText.match(/.*submit as open.*/i)) {
                    console.log('Menu found');
                    menuFinder.disconnect();
                    menuFinder = undefined;
                    menuHandler(menu);
                    menuHandler = undefined;
                }
            });
        });
    });
    menuFinder.observe(document.getElementsByTagName('BODY')[0], { childList: true });
    console.log('Triggering submit menu');
    expander.click();
};

const generateClicker = (status, expander) => {
    console.log(`Making clicker for ${status}`);
    return () => {
        console.log(`${status} click handler called`);
        generateDropUpFinder(expander, menu => {
            menu.childNodes.forEach(x => {
                if (x.innerText.trim().match(new RegExp(`.*${status}$`, 'i'))) {
                    console.log(`Clicking ${x.innerText.trim()}`);
                    x.click();
                }
            });
        });
    };
};

const generateButtonUpdater = (workspace) => {
    if (buttonUpdater) {
        console.log(`#${workspace.id}: Replacing existing buttonUpdater`);
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
                                    console.log(`#${workspace.id}: Ticket is submitted`);
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
    const zseGroup = document.getElementById(`${workspace.id}_zse`);
    if (zseGroup) {
        console.log(`#${workspace.id}: Not injecting buttons, already present`);
        workspace.classList.add('zse-expanded');
    } else {
        const style = workspace.getAttribute('style');
        if (!style || !style.match('.*display:\\s*none;.*')) {
            removeZseButtons();
            console.log(`#${workspace.id}: Injecting buttons`);
            const buttonGroup = workspace.querySelector(BUTTON_GROUP_SELECTOR);
            if (buttonGroup) {
                const submit = buttonGroup.querySelector('button[data-garden-id="buttons.button"]');
                const expander = buttonGroup.querySelector('button[data-garden-id="buttons.icon_button"]');
                const currentStatus = submit.getElementsByTagName('STRONG')[0];
                if (currentStatus.innerText) {
                    generateDropUpFinder(expander, menu => {
                        const buttons = menu.childNodes.map(x => x.querySelector('strong').innerText);
                        document.getElementsByTagName('BODY')[0].dispatchEvent(new Event('mousedown', { bubbles: true, }));
                        zseButtons = newButtonGroup(buttons, expander, currentStatus.innerText, workspace.id);
                        buttonGroup.parentNode.appendChild(zseButtons);
                        generateButtonUpdater(workspace);
                        workspace.classList.add('zse-expanded');
                    });
                }
                backupRetry = window.setTimeout(() => injectZseButtons(workspace), 50);
            } else {
                console.log(`#${workspace.id}: Ticket is closed`);
            }
        } else {
            console.log(`#${workspace.id}: Retrying on a background workspace`);
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
    } else {
        if (workspace) {
            console.log(`#${workspace.id}: There was no expanded button group`);
        } else {
            console.log('There was no saved button group');
        }
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
    console.log('looking for #main_panes');
    const mainPanes = document.getElementById('main_panes');
    if (mainPanes) {
        const observer = new MutationObserver(workspaceHook);
        observer.observe(mainPanes, { childList: true });
        console.log('Observer is listening on #main_panes');
        mainPanes.childNodes.forEach(x => {
            changeWorkspaceFocus(x);
        });
        console.log('#main_panes workspaces scanned');
    } else {
        window.setTimeout(mutationLoader, 100);
    }
};

mutationLoader();

HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
HTMLCollection.prototype.forEach = Array.prototype.forEach;

let backupRetry, menuHandler, menuFinder;
const BUTTON_GROUP_SELECTOR = '.ticket-resolution-footer div[data-garden-id="buttons.button_group_view"]';

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

const newButtonGroup = (statuses, expander, activeStatus) => {
    const buttonGroup = document.createElement('div');
    buttonGroup.classList.add('l-btn-group');
    buttonGroup.classList.add('zse-group');
    for (let status of statuses) {
        buttonGroup.appendChild(newButton(status, generateClicker(status, expander), status === activeStatus));
    }
    return buttonGroup;
};

const generateDropUpFinder = (expander, handler) => {
    if (menuHandler) {
        console.log('Replacing menuHandler');
        document.getElementsByTagName('BODY')[0].dispatchEvent(new Event('mousedown', { bubbles: true, }));
    }
    menuHandler = handler;

    if (menuFinder) {
        console.log('Replacing menuFinder');
        menuFinder.disconnect();
        document.getElementsByTagName('BODY')[0].dispatchEvent(new Event('mousedown', { bubbles: true, }));
    }
    menuFinder = new MutationObserver ((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
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
        generateDropUpFinder(expander, (menu) => {
            menu.childNodes.forEach((x) => {
                if (x.innerText.trim().match(new RegExp(`.*${status}$`, 'i'))) {
                    console.log(`Clicking ${x.innerText.trim()}`);
                    x.click();
                }
            });
        });
    };
};

const submitExpander = (buttonGroup) => {
    let expanded = false;
    buttonGroup.parentNode.childNodes.forEach((x) => {
        if (x.classList.contains('zse-group')) {
            expanded = true;
        }
    });
    if (!expanded) {
        const submit = buttonGroup.querySelector('button[data-garden-id="buttons.button"]');
        const expander = buttonGroup.querySelector('button[data-garden-id="buttons.icon_button"]');
        const currentStatus = submit.getElementsByTagName('STRONG')[0];
        if (currentStatus.innerText) {
            if (backupRetry) {
                clearTimeout(backupRetry);
                backupRetry = undefined;
            }
            console.log('Expanding button group now');
            generateDropUpFinder(expander, (menu) => {
                let buttons = [];
                menu.childNodes.forEach((x) => {
                    buttons.push(x.getElementsByTagName('STRONG')[0].innerText);
                });
                document.getElementsByTagName('BODY')[0].dispatchEvent(new Event('mousedown', { bubbles: true, }));
                const zseButtons = newButtonGroup(buttons, expander, currentStatus.innerText);
                buttonGroup.parentNode.appendChild(zseButtons);
                const updater = new MutationObserver ((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.tagName === 'STRONG') {
                                console.log('Ticket status has changed, recreating button group');
                                const updateFunction = () => {
                                    updater.disconnect();
                                    zseButtons.remove();
                                    console.log('Updater triggering submitExpander');
                                    submitExpander(buttonGroup);
                                };
                                let parent = buttonGroup.parentNode;
                                while (parent.tagName !== 'SECTION') {
                                    parent = parent.parentNode;
                                }
                                if (parent.classList.contains('working')) {
                                    console.log('waiting for ticket to submit');
                                    const updateDelay = new MutationObserver((mutations) => {
                                        let ready = false;
                                        mutations.forEach((mutation) => {
                                            if (mutation.attributeName === 'class' && !parent.classList.contains('working')) {
                                                ready = true;
                                            }
                                        });
                                        if (ready) {
                                            console.log('ticket is submitted');
                                            updateDelay.disconnect();
                                            window.setTimeout(updateFunction, 5);
                                        }
                                    });
                                    updateDelay.observe(parent, { attributes: true });
                                } else {
                                    updateFunction();
                                }
                            }
                        });
                    });
                });
                updater.observe(buttonGroup, { childList: true, subtree: true });
            });
            backupRetry = window.setTimeout(() => submitExpander(buttonGroup), 10);
        } else {
            const retry = new MutationObserver ((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.tagName === 'STRONG' && node.innerText) {
                            retry.disconnect();
                            console.log(`Retrying to make button group in '${node.innerText}' state`);
                            submitExpander(buttonGroup);
                        }
                    });
                });
            });
            retry.observe(currentStatus.parentNode, { childList: true });
        }
    } else {
        console.log('Aborting, button group already expanded');
    }
};

const buttonGroupFinder = (mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            console.dir(node);
            const buttons = node.querySelectorAll(BUTTON_GROUP_SELECTOR);
            console.log(buttons);
            buttons.forEach((x) => {console.log('Main finder triggering submitExpander'); submitExpander(x);});
        });
    });
};

const mutationLoader = () => {
    console.log('looking for #main_panes');
    const mainPanes = document.getElementById('main_panes');
    if (mainPanes) {
        const observer = new MutationObserver(buttonGroupFinder);
        observer.observe(mainPanes, { childList: true });
        console.log('listening');
        document.querySelectorAll(BUTTON_GROUP_SELECTOR).forEach(submitExpander);
        console.log('scanned');
    } else {
        window.setTimeout(mutationLoader, 100);
    }
};

mutationLoader();

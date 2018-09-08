HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
HTMLCollection.prototype.forEach = Array.prototype.forEach;

const BUTTON_GROUP_GARDEN_ID = 'buttons.button_group_view';

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

const generateDropUpFinder = (handler) => {
    const finder = new MutationObserver ((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                const menu = node.querySelector ? node.querySelector('ul[data-garden-id="menus.menu_view"]') : undefined;
                if (menu) {
                    console.log('Menu found');
                    finder.disconnect();
                    handler(menu);
                }
            });
        });
    });
    finder.observe(document.getElementsByTagName('BODY')[0], { childList: true });
};

const generateClicker = (status, expander) => {
    console.log(`Making clicker for ${status}`);
    return () => {
        console.log('Click handler called');
        generateDropUpFinder((menu) => {
            menu.childNodes.forEach((x) => {
                if (x.id.match(new RegExp(`.*-${status}$`, 'i'))) {
                    console.log(`Clicking ${status}`);
                    x.click();
                }
            });
        });
        expander.click();
    };
};

const submitExpander = (buttonGroup) => {
    if (buttonGroup.dataset.zseExpanded !== 'true') {
        const submit = buttonGroup.querySelector('button[data-garden-id="buttons.button"]');
        const expand = buttonGroup.querySelector('button[data-garden-id="buttons.icon_button"]');
        const currentStatus = submit.getElementsByTagName('STRONG')[0];
        if (currentStatus.innerText) {
            console.log('expanding button group now');
            buttonGroup.dataset.zseExpanded = true;
            generateDropUpFinder((menu) => {
                let buttons = [];
                menu.childNodes.forEach((x) => {
                    buttons.push(x.getElementsByTagName('STRONG')[0].innerText);
                });
                document.getElementsByTagName('BODY')[0].dispatchEvent(new Event('mousedown', { bubbles: true, }));
                const zseButtons = newButtonGroup(buttons, expand, currentStatus.innerText);
                buttonGroup.parentNode.appendChild(zseButtons);
                const updater = new MutationObserver ((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.tagName === 'STRONG') {
                                console.log('recreating button group');
                                updater.disconnect();
                                zseButtons.remove();
                                buttonGroup.dataset.zseExpanded = false;
                                submitExpander(buttonGroup);
                            }
                        });
                    });
                });
                if (currentStatus.parentNode) {
                    updater.observe(currentStatus.parentNode, { childList: true });
                }
            });
            expand.click();
        } else {
            const retry = new MutationObserver ((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.tagName === 'STRONG' && node.innerText) {
                            retry.disconnect();
                            console.log('retry observer');
                            submitExpander(buttonGroup);
                        }
                    });
                });
            });
            retry.observe(currentStatus.parentNode, { childList: true });
        }
    }
};

const buttonGroupFinder = (mutations) => {
    mutations.forEach((mutation) => {
        mutation.target.querySelectorAll(`div[data-garden-id="${BUTTON_GROUP_GARDEN_ID}"]`).forEach(submitExpander);
    });
};

const mutationLoader = () => {
    console.log('looking for #main_panes');
    const mainPanes = document.getElementById('main_panes');
    if (mainPanes) {
        const observer = new MutationObserver(buttonGroupFinder);
        observer.observe(mainPanes, { childList: true });
        console.log('listening');
        document.querySelectorAll(`div[data-garden-id="${BUTTON_GROUP_GARDEN_ID}"]`).forEach(submitExpander);
        console.log('scanned');
    } else {
        window.setTimeout(mutationLoader, 100);
    }
};

mutationLoader();

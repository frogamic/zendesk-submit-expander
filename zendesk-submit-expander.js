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

const newButtonGroup = (statuses = ['New', 'Open', 'Pending', 'Hold', 'Solved'], handlers = [console.log, console.log, console.log, console.log, console.log], activeStatus = 'New') => {
    const buttonGroup = document.createElement('div');
    buttonGroup.classList.add('l-btn-group');
    buttonGroup.classList.add('zse-group');
    for (let i in statuses) {
        buttonGroup.appendChild(newButton(statuses[i], handlers[i], statuses[i] === activeStatus));
    }
    return buttonGroup;
};

const submitExpander = (buttonGroup) => {
    if (!buttonGroup.dataset.zseExpanded) {
        const submit = buttonGroup.querySelector('button[data-garden-id="buttons.button"]');
        const expand = buttonGroup.querySelector('button[data-garden-id="buttons.icon_button"]');
        const currentStatus = submit.getElementsByTagName('STRONG')[0];
        if (currentStatus.innerText) {
            console.log('expanding button group now');
            buttonGroup.dataset.zseExpanded = true;
            buttonGroup.style.display = 'none';
            buttonGroup.parentNode.appendChild(newButtonGroup(undefined, undefined, currentStatus.innerText));
        } else {
            const retry = new MutationObserver ((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.tagName === 'STRONG' && node.innerText) {
                            console.log('retry observer');
                            submitExpander(buttonGroup);
                            retry.disconnect();
                        }
                    });
                });
            });
            retry.observe(currentStatus.parentNode, {childList: true, characterData: true, subtree: true});
        }
    }
};

const buttonGroupFinder = (mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.target.className === 'ember-view workspace') {
            mutation.target.querySelectorAll(`div[data-garden-id="${BUTTON_GROUP_GARDEN_ID}"]`).forEach(submitExpander);
        }
    });
};

const mutationLoader = () => {
    if (document.readyState === 'complete') {
        const observer = new MutationObserver(buttonGroupFinder);
        observer.observe(document.getElementsByTagName('BODY')[0], { childList: true, subtree: true });
        document.querySelectorAll(`div[data-garden-id="${BUTTON_GROUP_GARDEN_ID}"]`).forEach(submitExpander);
        return true;
    } else {
        return false;
    }
};

if (!mutationLoader()) {
    document.onreadystatechange = mutationLoader;
}

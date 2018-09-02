HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
HTMLCollection.prototype.forEach = Array.prototype.forEach;

const BUTTON_GROUP_GARDEN_ID = 'buttons.button_group_view';

const newButton = (status, handler, selected = false) => {
    console.log(selected);
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

const newButtonGroup = (statuses = ['New', 'Open', 'Pending', 'Hold', 'Solved'], handlers = [console.log, console.log, console.log, console.log, console.log]) => {
    const buttonGroup = document.createElement('div');
    buttonGroup.classList.add('l-btn-group');
    buttonGroup.classList.add('zse-group');
    for (let i in statuses) {
        buttonGroup.appendChild(newButton(statuses[i], handlers[i], statuses[i] === 'Open'));
    }
    return buttonGroup;
};

const submitExpander = (buttonGroup) => {
    console.log('expanding button group now');
    const submit = buttonGroup.querySelector('button[data-garden-id="buttons.button"]');
    const expand = buttonGroup.querySelector('button[data-garden-id="buttons.icon_button"]');
    buttonGroup.style.display = 'none';
    buttonGroup.parentNode.appendChild(newButtonGroup());
};

const divReChecker = (mutations) => {
    mutations.forEach((mutation) => {
        console.log(mutation);
        if (mutation.target.tagName === 'SPAN') {
            let parent = mutation.target.parentNode;
            while (!parent.dataset && !(parent.dataset.gardenId === BUTTON_GROUP_GARDEN_ID)) {
                parent = parent.parentNode;
            }
            submitExpander(parent);
        }
    });
};

const divChecker = (div) => {
    console.log('checking div');
    if (div.dataset && div.dataset.gardenId === BUTTON_GROUP_GARDEN_ID) {
        console.log('found the div');
        submitExpander(div);
        const observer = new MutationObserver(divReChecker);
        observer.observe(div, { childList: true, subtree: true });
    }
};

const buttonGroupFinder = (mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'DIV') {
                divChecker(node);
            }
        });
    });
};

const mutationLoader = () => {
    if (document.readyState === 'complete') {
        console.log('Document is Ready!');
        const observer = new MutationObserver(buttonGroupFinder);
        observer.observe(document.getElementsByTagName('BODY')[0], { childList: true, subtree: true });
        document.getElementsByTagName('DIV').forEach(divChecker);
        return true;
    } else {
        return false;
    }
};

if (!mutationLoader()) {
    document.onreadystatechange = mutationLoader;
}

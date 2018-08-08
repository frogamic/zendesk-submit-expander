let $buttonGroup = $('<div class="l-btn-group" id="zse-buttons"></div>');
$(document).ready(() => {
  // let observer = new MutationObserver((ml) => {});
  // observer.observe(document.getElementById('ember4740'), {childList: true});
  let status = $('button[data-garden-id="buttons.button"]:visible strong').text()
  console.log(`current status is ${status}`);
  $('button[data-garden-id="buttons.icon_button"]:visible').click();
  console.log('iterating the children');
  $('ul[data-garden-id="menus.menu_view"] strong').each((i, e) => {
    let submit = $(e).text();
    let $button = $(`<button class="c-btn" id="zse-btn-${submit}">${submit}</button>`);
    if (status === submit) {
      $button.addClass('is-selected');
    }
    $buttonGroup.append($button);
  });
  console.log('inserting the group');
  $('div[data-garden-id="buttons.button_group_view"]').hide().before($buttonGroup);
});

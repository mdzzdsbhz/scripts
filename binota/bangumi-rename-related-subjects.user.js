// ==UserScript==
// @name        Bangumi-Rename-Related-Subjects
// @namespace   BRRS
// @description Quickly rename all related subjects at the same time.
// @include     /^https?:\/\/((bgm|bangumi)\.tv|chii\.in)\/subject\/\d+\/add_related\/subject/
// @version     0.2.1.1
// @grant       none
// ==/UserScript==

var platforms = {
  book: [{id: 1001, name: '漫画', meta: 'Manga'},
         {id: 1002, name: '小说', meta: 'Novel'},
         {id: 1003, name: '画集', meta: 'Book'},
         {id: 0, name: '其它', meta: 'Book'}],
  anime: [{id: 1, name: 'TV', meta: 'TVAnime'},
          {id: 2, name: 'OVA', meta: 'OVA'},
          {id: 3, name: '剧场版', meta: 'Movie'},
          {id: 0, name: '其它', meta: 'Anime'}],
  music: [],
  game: [],
  real: [{id: 1, name: '日剧', meta: 'Television'},
         {id: 2, name: '欧美剧', meta: 'Television'},
         {id: 3, name: '华语剧', meta: 'Television'},
         {id: 0, name: '其它', meta: 'Television'}]
};

var MODE_NORMAL = 0, MODE_OFFPRINT = 1;

var subjects = [];
var saving = 0;
var editCount = 0;
var mode = MODE_NORMAL;
var editSummary = '标题修正+类型修正';
var editSummaryShuffix = ' [BRRS:' + (window.location.href.match(/subject\/(\d+)\/add_related/)[1]) + ']';
var formhash = $('input[name="formhash"]').val();
var platform = window.location.href.match(/add_related\/subject\/(anime|book|music|game|real)/)[1];

//Preparing workspace:
$('<div id="brrs-workspace" class="columns clearit" style="display: none; padding: 10px 0;">' +
      '<style>' +
          '#brrs-subject-list { width: 100%; }' +
          '#brrs-subject-list .renameSubject { width: calc(100% - 20px); height: 15px }' +
          '#brrs-subject-list .appendInput { width: 40px; height: 15px; } ' +
          '#brrs-subject-list tr { height: 40px; background: #F9F9F9; border-bottom: 1px solid #E0E0E0; padding: 5px 10px; }' +
          '#brrs-subject-list label { padding: 0 7px; }' +
      '</style>' +
      '<table id="brrs-subject-list"><thead></thead><tbody></tbody></table>' +
      '<input type="hidden" id="subject_infobox" style="display:none;">' +
      '<input id="brrs-save" type="button" class="inputBtn" value="批量保存">' +
      '<small class="grey clearit rr">Powered by <a href="https://github.com/bangumi/scripts/tree/master/binota" target="_blank">BRRS</a>.</small>' +
  '</div>').insertBefore('.mainWrapper .columns');
$('<a class="chiiBtn rr" id="brrs-launcher-normal" href="#">BRRS</a>').insertAfter('#modifyOrder');
$('<a class="chiiBtn rr" id="brrs-launcher-offprint" href="#">BRRS 单行本</a>').insertAfter('#modifyOrder');

$('#brrs-subject-list thead').append('' +
'<tr>' +
    '<td></td>' +
    '<td></td>' +
    '<td>' +
        '<input class="inputtext appendInput" name="brrs-append-start" type="number" value="1">' +
        ' ~ ' +
        '<input class="inputtext appendInput" name="brrs-append-end" type="number" value="' + subjects.length + '"> ' +
        '<a class="chiiBtn" href="#" onclick="eraseTitle()">清空</a>' +
        '<input class="inputtext appendFormat" name="brrs-append-format" type="text" value="{SeriesTitle} ({SeriesNumber})" title="{SeriesTitle} 为系列标题，{SeriesNumber} 为序号"> ' +
        '<a id="brrs-append-title" class="chiiBtn" href="#">批量替换标题</a>' +
        ' / <a class="chiiBtn" href="#" onclick="removeChineseName()">去中文名</a>' +
    '</td>' +
    '<td>' +
    (function() {
       var li = '';
       for(j in platforms[platform]) {
         li += '<input class="platform radio" ' +
                      'type="radio" ' +
                      'value="' + platforms[platform][j].id + '" ' +
                      'name="platform[0]"' +
                      'id="brrs-platform-' + platforms[platform][j].id + '"' +
                      'onchange="$(&quot;#brrs-subject-list .platform[value=\'' + platforms[platform][j].id + '\']&quot;).click()">';
         li += '<label for="brrs-platform-' + platforms[platform][j].id + '">' + platforms[platform][j].name + '</label>';
       }
       return li;
    })() +
    '</td>' +
    '<td></td>' +
'</tr>');
$('input[name="brrs-append-format"]').tooltip({offset: 5});

$('#brrs-append-title').click(function() {
  var format = $('input[name="brrs-append-format"]').val();
  format = format.replace(/{SeriesTitle}/g, $('.nameSingle a').text());
  var useSeriesNumber = (format.search('{SeriesNumber}') >= 1);
  if(useSeriesNumber) {
    var seriesNumber = parseInt(prompt('请输入序号起始', 1));
  }
  $('#brrs-subject-list input.renameSubject').each(function(i) {
    if((i + 1) < parseInt($('#brrs-workspace input[name="brrs-append-start"]').val())) return;
    if((i + 1) > parseInt($('#brrs-workspace input[name="brrs-append-end"]').val())) return;
    var newTitle = $(this).val() + format;
    if(useSeriesNumber) {
      newTitle = newTitle.replace(/{SeriesNumber}/g, seriesNumber++);
    }
    if(newTitle.trim() != $(this).val()) {
      $(this).parent().parent().attr('data-edited', '1');
    }
    $(this).val(newTitle);
  });
});


//Get subjects:
$('#brrs-launcher-normal').click(function() {
  mode = MODE_NORMAL;
  subjects = [];
  $('#crtRelateSubjects > li').each(function() {
    var subject = {};
    subject.id = $(this).attr('item_id');
    subject.title = $(this).find('.title a').html().trim();
    subjects.push(subject);
  });
  launcherBrrs();
});

$('#brrs-launcher-offprint').click(function() {
  mode = MODE_OFFPRINT;
  subjects = [];
  $('#crtRelateSubjects > li select').each(function() {
    if($(this).val() != "1003") return;
    
    var subject = {};
    subject.id = $(this).parent().parent().attr('item_id');
    subject.title = $(this).parent().parent().find('.title a').html().trim();
    subjects.push(subject);
  });
  launcherBrrs();
});

var launcherBrrs = function() {
  //Clean workspace:
  $('#brrs-subject-list tbody').html('');
  $('#brrs-workspace').show();
  if(mode == MODE_OFFPRINT) {
    $('#brrs-subject-list thead').show();
    $('#brrs-workspace input[name="brrs-append-end"]').val(subjects.length)
  } else {
    $('#brrs-subject-list thead').hide();
  }
  //Insert them into workspace:
  for(i in subjects) {
    var li = '<tr data-listid="' + i + '" data-edited="0" class="brrs-subject-list-item">';
    li += '<td>' + (parseInt(i) + 1) + '</td>';
    li += '<td><a class="chiiBtn" href="#" onclick="this.parentNode.parentNode.remove()">X</a></td>';
    li += '<td width="65%">';
    li += '<input class="inputtext renameSubject" '+
                 'name="brrs_titles[' + subjects[i].id + ']" ' +
                 'data-id="' + subjects[i].id + '" ' +
                 'data-title="' + subjects[i].title + '" ' +
                 'value="' + subjects[i].title + '"' +
                 'onchange="$(this.parentNode.parentNode).attr(\'data-edited\',\'1\')">';
    li += '</td><td>';
    $.get('/subject/' + subjects[i].id + '/edit_detail', function(data) {
      var subject_id = data.match(/<a href="\/subject\/(\d+)" title="[^"]*" property="v:itemre/)[1];
      var $i = null;
      for($i in subjects) {
        if(subjects[$i].id == subject_id) break;
      }
      
      subjects[$i].platform = data.match(/value="(\d+)" onclick="WikiTpl\('[^']+'\)" checked>/)[1];
      subjects[$i].infobox = data.match(/subject_infobox"[^>]+>([\S\s]*?)<\/textarea>/m)[1];
      subjects[$i].summary = data.match(/subject_summary"[^>]+>([\S\s]*?)<\/textarea>/m)[1];
      $('input[name="platform[' + subject_id + ']"][value=' + subjects[$i].platform + ']').attr('checked', 'true');
      
      var editbox = '';
      editbox += '<div style="padding: 10px">';
      editbox += '<h4>Infobox</h4>';
      editbox += '<textarea name="infobox" class="quick" rows="15">' + subjects[$i].infobox + '</textarea>';
      editbox += '<h4>Summary</h4>';
      editbox += '<textarea name="summary" class="quick" rows="7">' + subjects[$i].summary + '</textarea><br>';
      editbox += '<input type="button" class="inputBtn" value="确定" onclick="saveTbSubject(' + $i + ')">';
      editbox += '</div>';
      $('#brrs-subject-details-' + subject_id).html(editbox);
    });

    for(j in platforms[platform]) {
      li += '<input class="platform radio" ' +
                   'type="radio" ' +
                   'value="' + platforms[platform][j].id + '" ' +
                   'name="platform[' + subjects[i].id + ']"' +
                   'id="brrs-platform-' + subjects[i].id + '-' + platforms[platform][j].id + '"' +
                   'onchange="$(this.parentNode.parentNode).attr(\'data-edited\',\'1\');">';
      li += '<label for="brrs-platform-' + subjects[i].id + '-' + platforms[platform][j].id + '">' + platforms[platform][j].name + '</label>';
    }
    li += '</td><td>';
    li += '<a class="chiiBtn thickbox" href="#TB_inline?tb&height=500&width=500&inlineId=brrs-subject-details-' + subjects[i].id + '">详细</a>';
    li += '<div id="brrs-subject-details-' + subjects[i].id + '" style="display:none;"></div>';
    li += '</td>';
    li += '</tr>';
    $('#brrs-subject-list').append(li);
  }

  //Re-init thickbox
  tb_init('a.thickbox');
}


window.saveTbSubject = function(i) {
  $('#brrs-subject-list tr[data-listid=' + i + ']').attr('data-edited', '1');
  subjects[i].infobox = $('#TB_window textarea[name=infobox]').val();
  subjects[i].summary = $('#TB_window textarea[name=summary]').val();
  tb_remove();
}

window.eraseTitle = function() {
  $('#brrs-subject-list input.renameSubject').each(function(i) {
    if((i + 1) < parseInt($('#brrs-workspace input[name="brrs-append-start"]').val())) return;
    if((i + 1) > parseInt($('#brrs-workspace input[name="brrs-append-end"]').val())) return;
    $(this).val('');
  });
  $('#brrs-subject-list tr[data-edited=0]').attr('data-edited', '1')
}

window.removeChineseName = function() {
  if(!confirm('本功能仅限于单行本「没有副标」的情况下使用，\n若单行本有副标题请勿使用！\n要继续么？')) return;
  for(i in subjects) {
    var chs = subjects[i].infobox.match(/中文名=(.+)/);
    if(chs !== null && chs[1].trim().length > 0) {
      subjects[i].infobox = subjects[i].infobox.replace(/中文名=(.+)/, '中文名= ');
      $('#brrs-subject-list textarea[name="infobox"]').val(subjects[i].infobox);
      $('#brrs-subject-list tr[data-listid="' + i + '"]').attr('data-edited', '1');
      editSummary = '标题修正+类型修正+单行本去中文名';
    }
  }
}

//Save:

$("#brrs-save").click(function() {
  if(!confirm('这样就好了吗？')) return;
  editSummary = (prompt('请输入编辑摘要', editSummary) + editSummaryShuffix).trim();
  saving = 0;
  editCount = 0;
  //Get platforms:
  $('#brrs-subject-list tr[data-edited=1]').each(function() {
    editCount++;
    chiiLib.ukagaka.presentSpeech('保存中...(' + saving + '/' + editCount + ')');
    var postData = {};
    postData.formhash = formhash;
    postData.platform = $(this).find('input:checked').val();
    postData.subject_title = $(this).find('input.renameSubject').val();
    postData.subject_infobox = subjects[$(this).attr('data-listid')].infobox;
    postData.subject_summary = subjects[$(this).attr('data-listid')].summary;
    postData.editSummary = editSummary;
    postData.submit = '提交修改';
    $.post('/subject/' + subjects[$(this).attr('data-listid')].id + '/new_revision', postData, function() {
      saving++;
      chiiLib.ukagaka.presentSpeech('保存中...(' + saving + '/' + editCount + ')');
      if(saving >= editCount) chiiLib.ukagaka.presentSpeech('保存完毕~☆');
    })
  });
});


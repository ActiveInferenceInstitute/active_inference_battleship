-- Source-level Word layout; consumed by Pandoc before crossrefs and citeproc.
-- Give the policy names deliberate space instead of six equal-width columns.
function Table(t)
  if t.identifier == 'tbl:search' then
    t.colspecs = {
      {pandoc.AlignRight, 0.13}, {pandoc.AlignLeft, 0.28},
      {pandoc.AlignRight, 0.16}, {pandoc.AlignRight, 0.11},
      {pandoc.AlignLeft, 0.14}, {pandoc.AlignRight, 0.18}
    }
  elseif t.identifier == 'tbl:shots' or t.identifier == 'tbl:hits5' or
         t.identifier == 'tbl:entropy5' then
    t.colspecs = {
      {pandoc.AlignRight, 0.10}, {pandoc.AlignLeft, 0.20},
      {pandoc.AlignRight, 0.35}, {pandoc.AlignLeft, 0.18},
      {pandoc.AlignRight, 0.17}
    }
  end
  return t
end

-- An explanatory paragraph must stay with the display equation it introduces.
function Blocks(blocks)
  for i = 1, #blocks - 1 do
    local current, following = blocks[i], blocks[i + 1]
    if current.t == 'Para' and following.t == 'Para' and
       #following.content == 1 and following.content[1].t == 'Math' and
       following.content[1].mathtype == 'DisplayMath' then
      blocks[i] = pandoc.Div({current}, pandoc.Attr('', {},
        {['custom-style'] = 'Equation Lead'}))
    end
  end
  return blocks
end

-- The template projects raw page breaks before this project Word filter.
-- Remove the whole PDF-only container, including any projected Office break.
function Div(block)
  if block.classes:includes('pdf-only') then return {} end
  if block.classes:includes('visual-plate') then
    -- Reserve physical caption space while keeping each opening plate on one
    -- page. Word and PDF have separate layouts; retain the full caption text.
    block = block:walk({Image = function(image)
      image.attributes.width = '5.45in'
      return image
    end})
    for index, child in ipairs(block.content) do
      if child.t == 'Header' then
        block.content[index] = pandoc.Div({pandoc.Para(child.content)},
          pandoc.Attr('', {}, {['custom-style'] = 'Visual Plate Heading'}))
      end
    end
    return block
  end
end

function Header(header)
  if pandoc.utils.stringify(header.content) == 'References' then
    return pandoc.Div({pandoc.Para(header.content)},
      pandoc.Attr(header.identifier, {}, {['custom-style'] = 'References Opening'}))
  end
  if header.identifier == 'abstract' then
    return pandoc.Div({pandoc.Para(header.content)},
      pandoc.Attr(header.identifier, {}, {['custom-style'] = 'Body Opening'}))
  end
end

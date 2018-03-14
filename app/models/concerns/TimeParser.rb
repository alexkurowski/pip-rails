module TimeParser
  extend ActiveSupport::Concern

  included do
    def parse_time str
      str = str.split ' '
      x = str.first.to_i
      y = str.last

      x.send y
    end
  end
end
